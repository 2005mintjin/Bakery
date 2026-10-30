# 수정 안내

게임 실행에는 Node.js 20 이상만 필요합니다. `npm start` 또는 기존 배치 파일을 사용합니다. 빌드·번들링·패키지 설치 과정은 없습니다. 코드를 고치고 브라우저를 새로고침하면 반영됩니다. `server/`를 수정했다면 서버를 재시작합니다.

## 무엇을 바꾸려면 어디를 수정하나요?

| 수정 내용 | 담당 파일 |
| --- | --- |
| 게임 시작 순서 | `src/main.js` |
| 초기 객체·이미지·음악 준비 | `src/app/createGame.js` |
| 로딩할 JSON 목록 | `src/app/loadData.js` |
| 키보드·포커스·탭 숨김 처리 | `src/app/input.js` |
| E키 상호작용 | `src/app/interactions.js` |
| 시간·손님·오븐의 매 프레임 갱신 | `src/app/gameLoop.js` |
| 이동·충돌·장소 전환 | `src/player.js`, `src/sceneManager.js`, `src/exploration.js` |
| 캐릭터 방향·걷기 | `src/playerSprite.js`, `data/playerAnimations.json` |
| 화면 레이어 조합 | `src/renderer.js` |
| 배경 이미지·대체 배경 | `src/render/backgrounds.js`, `data/worldMaps.json`, `data/interiorBackgrounds.json` |
| 주민 SD PNG·그리기 | `src/residentArt.js`, `data/npcs.json` |
| 기본 픽셀 도형·임시 주민 | `src/render/pixelPainter.js`, `src/render/characters.js` |
| 실내 클릭 위치·손님 가림·직원 그림 | `src/interior.js`, `src/counterArt.js`, `src/staffArt.js` |
| 패널 공통 생성·닫기·알림 | `src/ui.js` |
| 화면 종류 등록 | `src/ui/screens.js` |
| 저장 메뉴·음악 설정 화면 | `src/ui/screens/settings.js` |
| 가방·퀘스트 목록 화면 | `src/ui/screens/journal.js` |
| 창고·진열·개점 화면 | `src/ui/screens/bakery.js` |
| 재료 구매·소포 화면 | `src/ui/screens/services.js` |
| 상태 표시·상호작용 안내 | `src/ui/hud.js`, `src/ui/hints.js` |
| 대화 글자 출력·페이지·선택지 표시 | `src/dialogueSequence.js`, `src/dialogueView.js` |
| 카페 바리스타·주문·대화 분기 | `data/staffStories.json`의 `cafe`, `data/serviceDialogues.json`의 `staff.cafe`, `src/staffStory.js` |
| 직원 이야기와 분기 | `data/staffStories.json`, `src/staffStory.js` |
| 손님 주문·거절·대화 후 거래 조건 | `data/serviceDialogues.json`, `src/serviceDialogue.js` |
| 주민 분기 대화·부탁·재방문 | `src/townStory.js`, `data/townStories.json` |
| 마을 주민·퀘스트 | `data/npcs.json`, `data/dialogues.json`, `data/quests.json`, `src/dialogue.js`, `src/quest.js` |
| 기력·수면·폐점·시계 경과 | `src/stamina.js`, `src/wellbeing.js`, `src/ui/screens/rest.js` |
| 시간별 노을·밤·새벽 | `src/render/daylight.js` |
| 카페 상품·기력 회복 화면 | `data/cafeItems.json`, `src/ui/screens/cafe.js` |
| 제빵 규칙·반죽 화면 | `src/baking.js`, `src/bakingUI.js`, `data/recipes.json` |
| 재고·손님·판매·구매 규칙 | `src/shop.js`, `src/bakery.js`, `src/inventory.js`, `data/storeItems.json` |
| 텃밭 성장·표시 | `src/garden.js`, `src/gardenArt.js` |
| 세이브 초기값·검증/구버전 이관 | `src/save/defaultState.js`, `src/save/validate.js` |
| 세이브 파일 API·옛 브라우저 저장 | `src/save/api.js`, `src/save/localStorage.js` |
| 타이틀·3개 슬롯 선택 | `src/title.js` |
| 서버 시작·요청 분배 | `server.js`, `server/app.js` |
| 파일 저장·캐릭터 이미지 업로드 | `server/routes/saves.js`, `server/routes/playerSheet.js`, `server/storage.js` |
| 정적 파일·음원 부분 요청·요청 본문 | `server/staticFiles.js`, `src/httpRange.js`, `server/http.js` |
| 기본 화면·실내 버튼·반죽·대화 스타일 | `src/styles/base.css`, `interiors.css`, `baking.css`, `dialogue.css` |
| 음원·음악 제어·노크 | `data/music.json`, `src/audio.js`, `src/effects.js` |

`src/saveSystem.js`와 `src/style.css`는 기존 호출 경로를 보존하는 진입 파일입니다. 원본 이미지·음원과 실행용 리소스는 `assets/`에, 원본 대사 TXT는 `data/source/`에 보존합니다. NPC·레시피·대사를 바꿀 때 관련 JSON만 수정합니다.

## 의존성과 상태

시작 코드는 `main → app`, UI는 `ui → screens → 기능 모듈` 순서로 호출합니다. 화면 파일은 UI 인스턴스를 인자로 받고 `UI` 클래스를 다시 가져오지 않습니다. 화면에서는 표시·클릭 처리를 담당하고 수량 차감·보상·성장은 기능 모듈에 둡니다. 모든 진행 상태는 전달받은 `game.state` 하나에서 관리합니다. 저장을 불러오면 이 객체가 교체되므로 상태를 다른 전역 변수에 복제하지 않습니다.

화면 하나를 추가할 때 담당 화면 파일과 `src/ui/screens.js` 등록만 수정합니다. 단순 함수 하나마다 파일을 만들기보다는 같은 기능의 함수들을 함께 둡니다. 다른 화면·리소스·실행 파일을 매번 다시 만들 필요는 없습니다.

## 확인할 범위

빠른 구문 검사:

```sh
npm run check
```

수정한 기능부터 검사합니다. 예시:

```sh
node --test tests/staffStory.test.js tests/serviceDialogue.test.js
node --test tests/production.test.js
node --test tests/server.test.js
```

공통 UI, 입력, 저장, 서버처럼 여러 기능이 사용하는 부분을 고치거나 배포하기 전에는 `npm test` 전체 검사를 실행합니다. 같은 코드에서 통과한 무관한 무거운 브라우저 검사를 반복하지 않습니다.

브라우저 검사 도구는 개발 환경에 Playwright와 Chromium이 있을 때 사용합니다. 일반 플레이에는 설치하지 않습니다. 서버를 실행한 뒤 해당 도구만 선택해 실행합니다.

| 수정 영역 | 실제 브라우저 검사 |
| --- | --- |
| 카페 원본 이미지·데셰네 전체 분기·주문·퇴장 | `node tools/check-cafe-browser.mjs` |
| 시간대·기력·퇴근/수면·카페·손님 SD/초상 | `node tools/check-wellbeing-browser.mjs` |
| 마리아·이시도로 이미지/부탁/취소/재방문·저장 | `node tools/check-town-browser.mjs` |
| 대화·상점·소포·주민 퀘스트·좁은 화면 | `node tools/check-service-browser.mjs` |
| 반죽·3종 제빵·재고·판매·농사·저장 | `node tools/check-production-browser.mjs` |
| 캐릭터 크기·색감·좌우 반전 | `node tools/check-player-browser.mjs` |
| 손님 상반신·계산대 가림·진열 그림 | `node tools/check-counter-browser.mjs` |

별도 설치된 도구는 `BAKERY_PLAYWRIGHT_MODULE`에 Playwright 모듈 URL, `BAKERY_BROWSER`에 Chromium 실행 경로를 지정할 수 있습니다. 카페/기력/주민/서비스/제작 검사는 슬롯 3을 잠시 사용하고 원본을 복원합니다. 이 검사들은 동시에 실행하지 않고, 다른 플레이어가 슬롯 3을 사용하는 중에도 실행하지 않습니다. 서버 API 테스트는 임시 폴더와 임시 포트를 사용하며 개인 세이브를 건드리지 않습니다.

## 패치와 저장 호환

- 실행 파일의 이름·ASCII/CRLF 인코딩·실행 명령을 유지합니다. 런타임 의존성을 추가하지 않습니다.
- 세이브 버전은 현재 5이며 버전 1~4 이관을 지원합니다. 버전 5부터 기력을 저장합니다. 구버전 기력은 100으로 한 번 초기화하며 기존 시간·재고·퀘스트를 보존합니다.
- 저장 형식 변경 시 초기값·검증·이관·관련 테스트를 함께 검토합니다. 가져온 값에 새 기본값을 매번 중복 지급하지 않습니다.
- 파일 저장은 임시 파일 작성 후 교체하며, 세이브와 사용자 이미지 쓰기는 하나의 서버 큐로 직렬화합니다.
- 패치는 변경한 파일을 Git으로 관리합니다. 새 배포 폴더에서는 기존 `saves/`를 복사해 이어 합니다. 사용자 세이브를 Git에 넣거나 초기화하지 않습니다.
- `npm run check`, `npm test`, 관련 브라우저 검사 결과와 확인하지 못한 환경을 변경 내역에 남깁니다.

## 이번 구조 정리 검증

기존 시스템 42개와 격리된 서버 API 테스트 4개, 전체 JavaScript 구문 검사를 통과했습니다. Chromium에서 대화·거래·제빵·농사·저장 복원·좁은 화면, 캐릭터 프레임과 카운터 가림을 검사했습니다. Windows PC에서 배치 파일을 직접 실행하지는 못했으며, 두 배치 파일의 바이트와 ASCII/CRLF 형식은 기존 그대로입니다.
