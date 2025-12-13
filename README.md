# WebService_Project2

JWT 인증
1) 로그인
1. 사용자 이메일/비밀번호 확인
2. DB에 Refresh Token Row 생성
3. Access Token 발급 (유효기간 15분)
4. Refresh Token 발급 
5. Refresh Token 해싱 -> DB에 저장

2) Access Token 검증
1. 쿠키 확인
2. 쿠키에 없을 시 헤더 확인
3. verifyAccessToken으로 만료/위조 검사
4. userId를 이용하여 사용자가 active인지 확인

3) Refresh Token 검증
1. 쿠키 -> 헤더 순 확인
2. verifyRefreshToken으로 만료/위조 검사
3. 해당 refresh token row 조회 -> revoke, expire 여부 및 id, hash 확인
4. 새 Access Token 발급 -> 쿠키 갱신

4) 로그아웃
1. Refresh Token 쿠키 디코드
2. DB의 해당 row의 revoked_at = now()
3. access + refresh 쿠키 삭제

“쿠폰 적용은 템플릿 기준으로 기록하며 발급본 ID는 별도 저장하지 않는다