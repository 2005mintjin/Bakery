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
| 웹/PC 저장 선택 | `src/save/mode.js`, `src/save/api.js` |
| 웹 슬롯 3개 저장 | `src/save/browserSlots.js` |
| JSON 파일 이식·가져오기/내보내기 UI | `src/save/transfer.js`, `src/ui/saveTransfer.js` |
| 데모 채널·로컬 포트·저장 폴더 | `src/edition.js`, `server.js`, `launch.bat` |
| 세이브 삭제 확인 UI | `src/ui/saveDelete.js` |
| 확대 글자·줄바꿈 | `src/styles/readability.css` |
| 정적 사이트 빌드/gh-pages 배포 | `tools/build-web.mjs`, `tools/publish-web.mjs` |
| 저장 메뉴·음악 설정 화면 | `src/ui/screens/settings.js` |
| 가방·물건 상세 | `src/ui/screens/inventory.js` |
| 퀘스트 목록 | `src/ui/screens/journal.js` |
| 반죽·빵 창고 | `src/ui/screens/warehouse.js` |
| 진열·개점 화면 | `src/ui/screens/bakery.js` |
| 재료 구매·소포 화면 | `src/ui/screens/services.js` |
| 상태 표시·상호작용 안내 | `src/ui/hud.js`, `src/ui/hints.js` |
| 글자별 목소리·별칭·샘플 | `src/dialogueVoice.js`, `data/voices.json`, `assets/audio/voices/` |
| 대화 글자 출력·페이지·선택지 표시 | `src/dialogueSequence.js`, `src/dialogueView.js` |
| 카페 바리스타·주문·대화 분기 | `data/staffStories.json`의 `cafe`, `data/serviceDialogues.json`의 `staff.cafe`, `src/staffStory.js` |
| 직원 이야기와 분기 | `data/staffStories.json`, `src/staffStory.js` |
| 손님 주문·거절·대화 후 거래 조건 | `data/serviceDialogues.json`, `src/serviceDialogue.js` |
| 주민 분기 대화·부탁·재방문 | `src/townStory.js`, `data/townStories.json` |
| 마을 주민·퀘스트 | `data/npcs.json`, `data/dialogues.json`, `data/quests.json`, `src/dialogue.js`, `src/quest.js` |
| 기력·수면·폐점·시계 경과 | `src/stamina.js`, `src/wellbeing.js`, `src/ui/screens/rest.js` |
| 시간별 노을·밤·새벽 | `src/render/daylight.js` |
| 카페 상품·기력 회복 화면 | `data/cafeItems.json`, `src/ui/screens/cafe.js` |
| 레시피북·토핑 카드 | `src/ui/workbench.js` |
| 공통 종류 탭·아이콘·재료·단계 표시 | `src/ui/craftWidgets.js`, `assets/ui/` |
| 웹페이지·공통 양피지 테마 | `index.html`, `src/styles/theme.css` |
| 제작·오븐·창고·가방 레이아웃 | `src/styles/crafting.css` |
| 도구 구매·오븐 개량 가격/규칙 | `src/equipment.js` |
| 공방 구매 화면 | `src/ui/screens/workshop.js` |
| 공방 입구·내부 배경 | `data/worldMaps.json`, `data/interiorBackgrounds.json`, `assets/backgrounds/interiors/staff-workshop.png` |
| 판매 메뉴 선택/무작위 주문 제한 | `src/ui/screens/bakery.js`, `src/shop.js` |
| 도구·메뉴 저장 이관/검증 | `src/save/progression.js` |
| 일괄 오븐·종류별 수량 입력 | `src/ovenUI.js`, `src/baking.js` |
| 반죽·오븐 저장 검증/이관 | `src/save/bakingState.js` |
| 반죽 종류·제품 ID·속재료 규칙 | `src/recipeBook.js`, `src/baking.js` |
| 방문객·선호도·무작위 1~3개 주문 | `data/customers.json`, `src/shop.js`, `data/serviceDialogues.json` |
| 판매실 재고·주문 패널 | `src/bakeryHud.js`, `src/ui/screens/shelf.js` |
| 제빵 규칙·반죽 화면 | `src/baking.js`, `src/bakingUI.js`, `data/recipes.json` |
| 재고·손님·판매·구매 규칙 | `src/shop.js`, `src/bakery.js`, `src/inventory.js`, `data/storeItems.json` |
| 텃밭 성장·표시 | `src/garden.js`, `src/gardenArt.js` |
| 세이브 초기값·검증/구버전 이관 | `src/save/defaultState.js`, `src/save/validate.js` |
| 세이브 파일 API·옛 브라우저 저장 | `src/save/api.js`, `src/save/localStorage.js` |
| 타이틀·3개 슬롯 선택 | `src/title.js` |
| 서버 시작·요청 분배 | `server.js`, `server/app.js` |
| 파일 저장·슬롯 삭제·직렬화 | `server/routes/saves.js`, `server/storage.js` |
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
| 정적 /Bakery/·웹 저장/JSON 이동·슬롯 삭제·사용자별 격리 | `node tools/check-web-browser.mjs` |
| 료·공방 2인 전 대사·직원별 구매 권한·새 방문객·가림 | `node tools/check-new-staff-browser.mjs` |
| 새 UI·탭/키보드·혼합 선택 유지/제한·좁은 화면 반죽 | `node tools/check-ui-browser.mjs` |
| 파이·쿠키·건조·8명 방문·수량 판매·진열 배경/UI | `node tools/check-expansion-browser.mjs` |
| 반죽 재고·혼합 6개·실제 60초·동시 반죽·이관 | `node tools/check-batch-browser.mjs` |
| 새 직원·방문객 MP3 디코딩·글자 동기화·무음·중단 | `node tools/check-staff-voices-browser.mjs` |
| 카페 원본 이미지·데셰네 전체 분기·주문·퇴장 | `node tools/check-cafe-browser.mjs` |
| 시간대·기력·퇴근/수면·카페·손님 SD/초상 | `node tools/check-wellbeing-browser.mjs` |
| 마리아·이시도로 이미지/부탁/취소/재방문·저장 | `node tools/check-town-browser.mjs` |
| 대화·상점·소포·주민 퀘스트·좁은 화면 | `node tools/check-service-browser.mjs` |
| 반죽·3종 제빵·재고·판매·농사·저장 | `node tools/check-production-browser.mjs` |
| 캐릭터 크기·색감·좌우 반전 | `node tools/check-player-browser.mjs` |
| 손님 상반신·계산대 가림·진열 그림 | `node tools/check-counter-browser.mjs` |

별도 설치된 도구는 `BAKERY_PLAYWRIGHT_MODULE`에 Playwright 모듈 URL, `BAKERY_BROWSER`에 Chromium 실행 경로를 지정할 수 있습니다. 새 메뉴/일괄 오븐/목소리/카페/기력/주민/서비스/제작 검사는 슬롯 3을 잠시 사용하고 원본을 복원합니다. 이 검사들은 동시에 실행하지 않고, 다른 플레이어가 슬롯 3을 사용하는 중에도 실행하지 않습니다. 서버 API 테스트는 임시 폴더와 임시 포트를 사용하며 개인 세이브를 건드리지 않습니다.

## 패치와 저장 호환

- 실행 파일의 이름·ASCII/CRLF 인코딩·실행 명령을 유지합니다. 런타임 의존성을 추가하지 않습니다.
- 세이브 버전은 현재 7이며 버전 1~6 이관을 지원합니다. 버전 7은 반죽 종류·건조 작업·1~3개 주문을 저장합니다. 버전 6은 준비 반죽과 최대 6개 판의 오븐을 별도 저장합니다. 버전 5부터 기력을 저장합니다. 구버전 기력은 100으로 한 번 초기화하며 기존 시간·재고·퀘스트를 보존합니다.
- 저장 형식 변경 시 초기값·검증·이관·관련 테스트를 함께 검토합니다. 가져온 값에 새 기본값을 매번 중복 지급하지 않습니다.
- 파일 저장은 임시 파일 작성 후 교체하며, 세이브 쓰기와 삭제는 하나의 서버 큐로 직렬화합니다.
- 패치는 변경한 파일을 Git으로 관리합니다. 새 배포 폴더에서는 기존 `saves/`를 복사해 이어 합니다. 사용자 세이브를 Git에 넣거나 초기화하지 않습니다.
- `npm run check`, `npm test`, 관련 브라우저 검사 결과와 확인하지 못한 환경을 변경 내역에 남깁니다.

## 이번 구조 정리 검증

기존 시스템 42개와 격리된 서버 API 테스트 4개, 전체 JavaScript 구문 검사를 통과했습니다. Chromium에서 대화·거래·제빵·농사·저장 복원·좁은 화면, 캐릭터 프레임과 카운터 가림을 검사했습니다. Windows PC에서 배치 파일을 직접 실행하지는 못했으며, 두 배치 파일의 바이트와 ASCII/CRLF 형식은 기존 그대로입니다.

## 목소리 변경

`voices.json`의 `speakers`에 샘플 경로와 캐릭터 이름 별칭을 지정합니다. 배우 이름은 `page.speaker`를 우선하고 없으면 `actor.name`을 사용합니다. 세 자매처럼 한 페이지에 여러 화자가 있으면 줄 앞의 이름표로 구분합니다. 이름표 자체와 구두점은 소리 내지 않습니다. 나레이션에는 `kind: "narration"`을 지정합니다. 임의의 주민에게 다른 인물의 목소리를 대신 붙이지 않습니다.

`dialogueView.js`는 자연 출력으로 새로 나타난 글자만 재생 모듈에 전달합니다. 건너뛰기로 늘어난 글자 수를 오디오에 전달하지 않습니다. 닫기·페이지 전환·탭 숨김 시 예약된 소리까지 중단해야 하며, 음성 캐시나 오디오 노드는 세이브에 넣지 않습니다. 긴 샘플도 한 글자 간격보다 길게 겹치지 않습니다.

## 일괄 오븐 수정

`baking`은 치대기·토핑만 담당하고 토핑 선택 완료 시 `doughs`에 종류별로 1개를 더합니다. 굽기를 시작할 때만 선택 수량을 `doughs`에서 차감하고 독립적인 `oven.batch`에 넣습니다. `oven`의 완성 빵을 꺼낼 때 `warehouse`에 한 번만 더합니다. 반죽 수량·재료·기력을 중복 차감하지 않습니다. 실제 타이머 상수 `bakeSeconds=60`, 한 판 제한 `ovenCapacity=6`은 `src/baking.js`에 있습니다.

굽기 완료 시 반죽 작업창을 다시 그리지 않습니다. 진행 중인 마우스 치대기와 작업 반죽을 유지하고 오븐 관리 창만 갱신합니다. 저장 형식 변경은 `save/bakingState.js`에서 구버전 판을 이관하는 경로와 검증을 함께 수정합니다. 테스트를 빠르게 만들기 위해 실제 60초 규칙을 줄이지 않습니다. 단위 테스트는 경과 시간을 직접 전달하고 브라우저 검사에서 한 판을 실제 60초 기다립니다.

## 새 메뉴·손님 수정

`recipeBook.js`에는 제품 ID와 반죽별 기본 재료·속재료를, `data/recipes.json`에는 표시 이름·판매가·총 재료를 둡니다. 새 제품을 넣으면 `inventory.js`의 이름과 두 정의를 함께 수정합니다. `tests/pastries.test.js`는 JSON의 총 재료가 실제 반죽/속재료 비용과 같은지, 전 메뉴를 제작할 수 있는지 확인합니다. 저장 초기값은 제품 ID에서 생성되며 이관에서 기존 종류를 보존합니다.

`customers.json`은 방문 순서·이름·초상·SD 영역·선호 가중치를 정의합니다. 손님이 올 때 `shop.js`가 가중 무작위 제품과 1~3개 수량을 뽑아 주문 객체에 고정합니다. 화면을 다시 그리거나 대화를 열 때 추첨하지 않습니다. 재고 부족 시 일부 소비·부분 결제가 없어야 합니다. 수량만큼 진열 재고를 차감하고 단가 × 수량을 한 번 정산합니다.

건조는 `oven.kind: "drying"`과 `batch.driedberry`를 사용합니다. 시작 시 생베리를 차감하고 수령 시에만 재료 가방에 말린 베리를 넣습니다. 굽기와 건조는 같은 슬롯을 사용하며 동시에 실행하지 않습니다. 상태 검증은 `save/bakingState.js`에서 종류별로 처리합니다.

새 판매실은 첨부된 배경 그대로 그립니다. `counterArt.js`는 손님과 계산대 앞 레이어만 그리며 음식 재고를 배경에 추가하지 않습니다. 재고·주문은 `bakeryHud.js`의 DOM 패널, 수량 진열·회수는 `ui/screens/shelf.js`가 담당합니다. 이미지 속 음식 수와 실제 재고를 연결하지 않습니다.

### UI 수정 시 주의
`theme.css`는 공통 색상·프레임, `crafting.css`는 제작/창고/가방 배치만 담당합니다. 기존 스타일 파일 뒤에 불러옵니다. 탭 선택과 오븐의 미확정 수량은 UI 인스턴스에만 두며, 탭 변경으로 게임 재료나 기력을 차감하지 않습니다. 굽기 확정은 기존 `putInOven` 규칙을 사용합니다. 저장을 불러와 상태 객체가 바뀌면 미확정 선택은 초기화합니다.

### 공방 성장 시스템 (저장 v8)
장비/개량은 `equipment.js`, 이관은 `save/progression.js`를 수정합니다. 새 게임의 틀은 잠겨 있고 구버전에서 이미 제작한 종류만 자동 해금합니다. `ovenLimit(state)`와 `ovenDuration(state)`를 화면/규칙에서 함께 사용하세요. `baking.js`의 6/60 상수는 기본값·구버전 이관용입니다. 시작한 판에는 `oven.duration`을 저장하며, 오븐이 비어 있어야 개량할 수 있습니다. 새 개량 단계를 추가하면 저장 검증 범위와 브라우저 검사를 함께 갱신합니다.

판매 메뉴는 `shop.menu`에 저장합니다. `setSaleMenu`로 변경하고 `tickShop`은 해금된 선택 목록만 주문합니다. 대기 주문은 메뉴 변경으로 다시 추첨하거나 취소하지 않습니다. 재고 0도 메뉴로 선택할 수 있고 실제 지급은 기존 진열 수량 검사를 따릅니다.

글꼴은 `theme.css`의 `--ui-font`, 캔버스 글자는 `render/pixelPainter.js`에서 지정합니다. 휴먼 글꼴은 설치된 경우만 사용하며 라이선스가 필요한 폰트 파일을 배포하지 않습니다. 새 카운터 가림 기준은 `counterArt.js`의 `frontY`(논리 좌표 456)입니다. 배경을 바꾸면 테이블 윗면을 다시 확인하고 방문객 8명의 전경 픽셀 비교 검사를 실행하세요.

### 정적 웹 배포
`npm run build:web`이 `index.html`의 저장 모드 meta를 `server`에서 `browser`로 바꾸고 `src/data/assets`와 `.nojekyll`만 `dist/web`에 복사합니다. 소스 HTML은 PC 서버 모드를 유지합니다. API 장애 때 웹 저장으로 자동 전환하지 않습니다. 웹 키에는 사이트 경로가 들어가며 슬롯 간·다른 게임 간 충돌을 피합니다. 웹 저장은 브라우저별이고 자동 서버 동기화가 없습니다.

`npm run publish:web`은 별도 임시 Git 인덱스로 정적 트리를 커밋해 `gh-pages`에 push합니다. 기존 `main`/작업 인덱스를 변경하지 않습니다. GitHub Pages는 `gh-pages`의 루트를 소스로 설정합니다. 첫 활성화/배포 상태를 확인할 권한이나 네트워크가 없으면 브랜치 업로드와 실제 사이트 확인을 구분해 보고하세요.

웹 배포 후 검사는 `tools/check-web-browser.mjs`로 API 없는 정적 호스트의 /Bakery/ 경로에서 수행합니다. 세이브 API 검사와 달리 이 도구는 개인 saves를 사용하지 않습니다. 웹 저장 규칙·오류·파일 이동·빌드 제외 범위는 `tests/webSave.test.js`에서 검사합니다. 웹/PC 저장 변경 시 두 실행 방식의 브라우저 검사를 함께 수행합니다.

### 데모 변경 확인과 정식판 보호
현재 `demo` 브랜치는 정식 배포와 별도입니다. `src/edition.js`의 데모 설정은 로컬 포트 5174·saves-demo 저장과 화면 배지를 결정합니다. Windows 배치 파일도 5174로 실행합니다. 웹 저장은 little-hearth:demo:web 네임스페이스를 사용합니다. demoEdition이 참이면 publish:web은 Git/네트워크 작업 전에 정식 배포를 차단합니다. 정식 승격은 사용자 검토 후 별도 작업으로 수행하며 데모의 포트·저장 위치·배지가 그대로 정식판에 들어가지 않게 확인합니다.

세이브 삭제는 `deleteSlot` API를 통해 처리합니다. 서버는 슬롯 파일 쓰기와 삭제를 같은 큐에 넣어 쓰기 중 삭제한 파일이 다시 생기는 문제를 막습니다. 슬롯은 1~3으로 제한하며 삭제 시 손상 파일도 읽어 검증하지 않고 해당 파일만 지웁니다. 현재 슬롯 삭제 후에는 타이틀로 이동해 자동 재저장을 방지합니다. 테스트에는 실제 saves/saves-demo를 사용하지 않습니다.

이미지 교체 UI·spritePicker·customSheet·player-sheet API를 제거했습니다. 예전 개인 이미지의 저장 플래그와 파일은 읽지 않습니다. 기본 스프라이트만 `PlayerSprite.draw`에서 사용합니다. 수정 검사는 `node tools/check-demo-browser.mjs`와 `node tools/check-web-browser.mjs`로 수행합니다. 과거의 정식 서버 대상 검사 도구는 5173/saves를 사용할 수 있으므로 이 데모에서는 위 두 도구를 우선 사용하세요.

### 료와 공방 직원 추가
첨부 원본은 새 파일명으로 보존하고, 사용 경로는 `interiorBackgrounds.json`, `serviceDialogues.json`, `customers.json`에서 지정합니다. 배경에 인물이 포함되어 있어 직원은 `embeddedInBackground: true`로 설정합니다. SD는 빵집 카운터 전용, 상반신은 대화 전용입니다. 원본 대사 세 파일은 `data/source/`에 보관합니다.

`StaffStory`는 직원 키와 실제 장소를 분리합니다. `mold`/`furnace` 직원의 location은 모두 workshop이며, shopPanel은 각각 workshopMolds/workshopOven입니다. UI는 `staffServices` 매핑의 장소·직원 키로 접근 권한을 확인합니다. 매번 대화를 시작하면 권한을 초기화하고 상점 선택 후에만 해당 직원 키를 허용합니다. 틀 구매 화면에서 오븐 개량으로 바로 우회하지 않도록 확인하세요. 기존 post/store/cafe는 장소와 직원 키가 같습니다.

새 방문객 ID는 soma/crematory이고, 우체국은 기존 post-clerk ID를 유지합니다. 저장의 기존 post-clerk 대기 주문은 이름만 료로 정규화하고 품목·수량·도착 단계는 유지합니다. 데이터 구조가 달라지지 않아 저장 버전은 8입니다. 세 신규 인물의 음성은 Downloads (11)의 MP3로 연결합니다. post-clerk 키의 asset은 ryo.mp3로 교체하고 료 별칭을 사용합니다. soma/crematory 키를 추가하고 크레마·크리마는 crematory의 별칭으로 처리합니다. 회귀 검사는 staffStory/pastries 테스트와 check-new-staff-browser 도구를 사용합니다.

음성 검사는 개인 저장을 쓰지 않는 `check-staff-voices-browser.mjs`를 우선 사용합니다. 이 도구는 실제 AudioBufferSource 시작과 버퍼 키를 기록하여 직원/빵집 손님 모두 글자 수만큼 올바른 샘플이 시작되는지 검사합니다. 정적 데모 호스트를 자체 실행하며 세이브 형식은 바꾸지 않습니다.
