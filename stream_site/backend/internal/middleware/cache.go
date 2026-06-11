package middleware

import (
	"bytes"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/gin-gonic/gin"
)

const noWritten = -1

type cacheWriter struct {
	gin.ResponseWriter
	body        bytes.Buffer
	statusCode  int
	size        int
	wroteHeader bool
}

func newCacheWriter(w gin.ResponseWriter) *cacheWriter {
	return &cacheWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
		size:           noWritten,
	}
}

func (w *cacheWriter) WriteHeader(code int) {
	if w.wroteHeader {
		return
	}
	w.statusCode = code
	w.wroteHeader = true
}

func (w *cacheWriter) WriteHeaderNow() {
	if !w.wroteHeader {
		w.WriteHeader(w.statusCode)
	}
}

func (w *cacheWriter) Write(data []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.body.Write(data)
	if w.size == noWritten {
		w.size = 0
	}
	w.size += n
	return n, err
}

func (w *cacheWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
}

func (w *cacheWriter) Status() int {
	return w.statusCode
}

func (w *cacheWriter) Size() int {
	return w.size
}

func (w *cacheWriter) Written() bool {
	return w.wroteHeader
}

func Cache(defaultTTL time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		originalWriter := c.Writer
		writer := newCacheWriter(originalWriter)
		c.Writer = writer
		c.Next()

		if writer.Status() != http.StatusOK || writer.body.Len() == 0 {
			flushCachedResponse(originalWriter, writer)
			return
		}

		hash := xxhash.Sum64(writer.body.Bytes())
		etag := `W/"` + hex.EncodeToString(uint64ToBytes(hash)) + `"`
		ifNoneMatch := strings.TrimSpace(c.GetHeader("If-None-Match"))

		headers := originalWriter.Header()
		headers.Set("ETag", etag)
		headers.Set("X-ETag", etag)
		headers.Set("Cache-Control", cacheControlForPath(c.FullPath(), defaultTTL))

		if ifNoneMatch == etag {
			headers.Del("Content-Length")
			originalWriter.WriteHeader(http.StatusNotModified)
			return
		}

		flushCachedResponse(originalWriter, writer)
	}
}

func cacheControlForPath(path string, defaultTTL time.Duration) string {
	switch path {
	case "/api/mirrors":
		return "public, max-age=30, s-maxage=30, stale-while-revalidate=30"
	case "/api/health":
		return "public, max-age=5, s-maxage=5, stale-while-revalidate=10"
	default:
		seconds := int(defaultTTL / time.Second)
		if seconds <= 0 {
			seconds = 5
		}
		return "public, max-age=" + itoa(seconds) + ", s-maxage=" + itoa(seconds) + ", stale-while-revalidate=30"
	}
}

func flushCachedResponse(original gin.ResponseWriter, writer *cacheWriter) {
	status := writer.Status()
	if status == 0 {
		status = http.StatusOK
	}
	original.WriteHeader(status)
	if writer.body.Len() > 0 {
		_, _ = original.Write(writer.body.Bytes())
	}
}

func uint64ToBytes(v uint64) []byte {
	return []byte{
		byte(v >> 56),
		byte(v >> 48),
		byte(v >> 40),
		byte(v >> 32),
		byte(v >> 24),
		byte(v >> 16),
		byte(v >> 8),
		byte(v),
	}
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	var out [20]byte
	i := len(out)
	for v > 0 {
		i--
		out[i] = byte('0' + v%10)
		v /= 10
	}
	return string(out[i:])
}
