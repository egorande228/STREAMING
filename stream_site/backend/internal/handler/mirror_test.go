package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"stream_site/backend/internal/service"
)

func TestCreatePrimaryMirrorDemotesExistingPrimaryInTransaction(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	h := NewMirrorHandler(sqlxDB, service.NewTelegramNotifier("", ""))

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE mirrors SET is_primary = false WHERE is_primary = true`).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`INSERT INTO mirrors \(domain, is_active, is_primary, region, priority\) VALUES \(\$1, \$2, \$3, \$4, \$5\) RETURNING id`).
		WithArgs("mirror.example", true, true, "eu", 10).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(17))
	mock.ExpectCommit()

	req := httptest.NewRequest(http.MethodPost, "/api/admin/mirrors", bytes.NewBufferString(`{
		"domain":"mirror.example",
		"is_active":true,
		"is_primary":true,
		"region":"eu",
		"priority":10
	}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	h.Create(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, w.Code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestUpdatePrimaryMirrorDemotesExistingPrimaryInTransaction(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	h := NewMirrorHandler(sqlxDB, service.NewTelegramNotifier("", ""))

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE mirrors SET is_primary = false WHERE is_primary = true AND id <> \$1`).
		WithArgs(9).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`UPDATE mirrors SET domain=\$1, is_active=\$2, is_primary=\$3, region=\$4, priority=\$5 WHERE id=\$6`).
		WithArgs("mirror.example", true, true, "us", 5, 9).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	req := httptest.NewRequest(http.MethodPut, "/api/admin/mirrors/9", bytes.NewBufferString(`{
		"domain":"mirror.example",
		"is_active":true,
		"is_primary":true,
		"region":"us",
		"priority":5
	}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "9"}}
	c.Request = req

	h.Update(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
