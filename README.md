# 감정의온도 Gamdo

<h3>날씨, 시간, 감정에 따른 다양한 영화를 추천 받아보세요!  <br />
  | 새벽에 볼 공포영화 없나..?<br />
  | 우울한 날에 추천 받을만한 영화 없을까..?<br />
  | 날씨에 맞는 영화 추천받고 싶다!<br />
  <br />
<img width="419" height="536" alt="image" src="https://github.com/user-attachments/assets/526303af-4d39-49a2-9c21-6b8930e2f3e2" />

*로그인 페이지에서 회원가입없이 테스트 계정으로 로그인 해보실 수 있습니다.

# 설명


# 역할

영화 추천 시스템(feature/recommender) - 정훈<br >
: DB에 저장하는 부분은 없음.
: 기상청 API 파싱
: 추천페이지 내 사용자의 감정, 장르, 시간정보 zustand에 저장`
: 프롬프트 및 Gemini AI 연동
: 리턴된 영화 포스터 보여주기

영화 저장 시스템<br >(feature/save) - 정훈
: 사용자, 영화id, 날짜를 저장하고, 포스터이미지까지 받아오기<br >

회원 등록 시스템(feature/signin) - 소연<br >
: 회원정보를 db에 저장
feature/user
: signin에서 파생함. user와 관련된 정보<br >

영화 조회 시스템(feature/search) - 지나<br >
: tmdb에서 제목, 감독 등을 이용해 영화 리스트 반환<br >

영화 리뷰등록 시스템(feature/review) - 지나<br >
: 사용자, 영화, 한줄평내용, timestamp 저장하기<br >

영화 찜하기 시스템(feature/favorite-movie)<br > - 동우
: 사용자, 영화, 추천 여부 저장<br >


