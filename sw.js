// 밤 한강: 홈 화면 추가용 서비스워커. 파일을 저장(캐시)하지 않는다 → 배포하면 바로 새 화면
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
