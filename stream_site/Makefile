TARGET ?= http://localhost
VUS ?= 1000
DURATION ?= 10m
MATCH_ID ?= 1
STREAM_KEY ?= demo

.PHONY: loadtest-viewers loadtest-chat loadtest-mixed

loadtest-viewers:
	k6 run -e TARGET=$(TARGET) -e VUS=$(VUS) -e DURATION=$(DURATION) -e STREAM_KEY=$(STREAM_KEY) scripts/loadtest/k6-viewers.js

loadtest-chat:
	k6 run -e TARGET=$(TARGET) -e VUS=$(VUS) -e DURATION=$(DURATION) -e MATCH_ID=$(MATCH_ID) scripts/loadtest/k6-chat.js

loadtest-mixed:
	k6 run -e TARGET=$(TARGET) -e VUS=$(VUS
	) -e DURATION=$(DURATION) -e MATCH_ID=$(MATCH_ID) -e STREAM_KEY=$(STREAM_KEY) scripts/loadtest/k6-mixed.js
