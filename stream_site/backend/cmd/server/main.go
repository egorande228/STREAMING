package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"stream_site/backend/internal/config"
	"stream_site/backend/internal/handler"
	"stream_site/backend/internal/middleware"
	"stream_site/backend/internal/repository"
	"stream_site/backend/internal/service"
	"stream_site/backend/internal/ws"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	// Infrastructure
	db := repository.NewPostgres(cfg.DatabaseURL)
	rdb := repository.NewRedis(cfg.RedisURL)
	defer db.Close()

	// WebSocket hub
	hub := ws.NewHub(rdb)

	// Telegram notifier (used by health checker and admin activate)
	telegram := service.NewTelegramNotifier(cfg.TelegramToken, cfg.TelegramChatID)

	// Handlers
	matchH := handler.NewMatchHandler(db, rdb)
	matchH.SetHub(hub)
	statsH := handler.NewStatsHandler(db)
	groupH := handler.NewGroupHandler(db, rdb)
	streamH := handler.NewStreamHandler(db)
	authH := handler.NewAuthHandler(db, cfg.JWTSecret)
	mirrorH := handler.NewMirrorHandler(db, telegram)
	chatH := handler.NewChatHandler(hub, rdb)
	healthH := handler.NewHealthHandler(mirrorH)
	rtmpInternalH := handler.NewRTMPInternalHandler(db)

	// Mirror health checker background service
	healthSvc := service.NewMirrorHealthChecker(db, rdb, telegram)
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	go healthSvc.Start(ctx)

	// Router
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	_ = r.SetTrustedProxies([]string{"127.0.0.1/32", "172.16.0.0/12", "10.0.0.0/8"})
	r.TrustedPlatform = "CF-Connecting-IP"

	// CORS — allow all mirror domains
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// Rate limiting middleware factory
	rl := func(max int) gin.HandlerFunc {
		return middleware.RateLimit(rdb, max, time.Minute)
	}
	cacheMW := middleware.Cache(5 * time.Second)

	// ── Public API ──────────────────────────────────────────────────────────
	api := r.Group("/api")
	{
		api.GET("/health", cacheMW, healthH.Health)
		api.GET("/mirrors", rl(30), cacheMW, healthH.Mirrors)

		// Matches
		matches := api.Group("/matches")
		matches.Use(rl(120), cacheMW)
		{
			matches.GET("", matchH.List)
			matches.GET("/:id", matchH.Get)
		}

		// Groups / standings
		groups := api.Group("/groups")
		groups.Use(rl(60), cacheMW)
		{
			groups.GET("", groupH.List)
			groups.GET("/:id", groupH.Get)
		}

		// Match stats (H2H, form, events, lineups)
		api.GET("/matches/:id/stats", rl(60), statsH.GetMatchStats)

		// WebSocket chat
		api.GET("/ws/chat/:matchId", chatH.Chat)
		api.GET("/ws/live", chatH.LiveScores)

		// Auth
		api.POST("/admin/login", rl(10), authH.Login)
	}

	r.POST("/internal/rtmp/authorize", rtmpInternalH.Authorize)
	r.POST("/internal/rtmp/done", rtmpInternalH.Done)
	r.GET("/metrics/ws", hub.Metrics)

	// ── Admin API (JWT protected) ────────────────────────────────────────────
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		// Matches
		admin.GET("/matches", matchH.List)
		admin.POST("/matches", matchH.Create)
		admin.PUT("/matches/:id", matchH.Update)
		admin.PUT("/matches/:id/score", matchH.UpdateScore)
		admin.DELETE("/matches/:id", matchH.Delete)
		admin.POST("/matches/:id/events", statsH.CreateEvent)
		admin.DELETE("/matches/:id/events/:eid", statsH.DeleteEvent)
		admin.POST("/matches/:id/lineups", statsH.CreateLineup)
		admin.DELETE("/matches/:id/lineups/:lid", statsH.DeleteLineup)

		// Streams
		admin.GET("/streams", streamH.List)
		admin.POST("/streams", streamH.Create)
		admin.PUT("/streams/:id", streamH.Update)
		admin.DELETE("/streams/:id", streamH.Delete)

		// Mirrors
		admin.GET("/mirrors", mirrorH.ListAll)
		admin.POST("/mirrors", mirrorH.Create)
		admin.PUT("/mirrors/:id", mirrorH.Update)
		admin.DELETE("/mirrors/:id", mirrorH.Delete)
		admin.POST("/mirrors/:id/activate", mirrorH.Activate)

	}

	// ── Server ────────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("server listening on :%s (env=%s)", cfg.Port, cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down...")
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("server stopped")
}
