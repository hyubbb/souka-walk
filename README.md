# souka 출근길

souka 마스코트를 직접 조종해 집 안을 돌아다니고, 현관을 나서 골목과 편의점까지 걸어가며
인스타그램용 사진(4:5)과 릴스(9:16)를 찍는 레트로 3D 웹 게임입니다.
2000년대 일본 저예산 3D 게임 느낌을 목표로 합니다.

## 실행

요구 사항: Node.js 20 이상, npm

```bash
npm install
npm run dev          # http://localhost:5173
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 체크 + 프로덕션 빌드 → `dist/` |
| `npm run build:single` | 모든 코드를 `dist/index.html` 한 파일에 담은 빌드 (claude.ai 아티팩트 게시용) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | 타입 체크만 |

## 조작

| 키 | 동작 |
| --- | --- |
| WASD / 방향키 | 걷기, 운전 |
| Shift | 달리기 |
| 드래그 · Q/E · 휠 | 카메라 회전 · 높이 · 거리 |
| C | 앉기, 눕기, 문, 물건 들기/놓기, 차·자전거 타기/내리기 |
| Z / X | 들고 있는 물건을 놓을 거리 |
| L | 차·자전거 라이트 |
| P | 사진 모드 (표정 1–6, 포즈 F, 시간대 T, 자막 가이드 G, 찍기 Space) |
| R | 릴스 모드 (V로 녹화 시작/정지) |
| B | 편집 모드 (클릭·드래그로 옮기기, Q/E 회전, Delete 숨기기) |

편집 모드에서 바꾼 배치는 브라우저의 localStorage에 저장됩니다.

## 구조

게임 본체는 Three.js 모듈이고, 옆 패널과 화면 위 글자(HUD, 자막, 토스트, 모달)는 React입니다.
두 쪽은 `Game` 객체 하나를 공유합니다. 게임 상태는 `G.S`, 화면에만 필요한 값은 `G.ui`에 있고,
게임이 `G.notify()`를 부르면 React가 다시 그립니다.

```
src/
  main.tsx, App.tsx       React 진입점 (게임을 stage에 붙임)
  styles.css
  ui/
    useGame.ts            게임 store 구독 훅
    Panel.tsx             조작 패널 (모드별 섹션, 표정·포즈·자막·꾸미기·화질·앨범)
    Overlays.tsx          HUD, 안내 문구, 토스트, 자막 미리보기, REC 표시
    Modals.tsx            찍은 사진 / 녹화한 릴스
  game/
    index.ts              createGame(): 모듈을 순서대로 조립
    core.ts               렌더러, 씬, 시드 랜덤, 텍스처 도우미, 충돌, 편집 가능한 물체 등록 (O/E)
    types.ts              State, UiState, EditObj 등 타입
    lighting.ts           시간대별 하늘·조명
    world/alley.ts        골목 (건물, 정원, 간판, 전봇대, 가로등, 자판기, 편의점)
    world/house.ts        집 (방 6개 + 베란다, 가구, 크기 개그 소품)
    character.ts          souka 모델, 표정, 입 모양, 꾸미기, 포즈
    interact.ts           C키 상호작용, 물건 들기/놓기, 집↔골목 이동
    vehicles.ts           자동차·자전거
    modes.ts              사진·릴스 모드, 구도 프리셋
    capture.ts            사진 저장, 릴스 합성·녹화, 자막 그리기, 화면 크기 맞춤
    edit.ts               편집 모드와 배치 저장
    quality.ts            화질 프리셋 (해상도, 텍스처 필터, 그림자)
    input.ts              키보드·마우스
    loop.ts               매 프레임 갱신 (이동, HUD, 카메라, 벽·건물 가리기)
```

### 알아 둘 점

- 골목과 집은 시드 랜덤(`rnd()`)으로 텍스처와 배치를 만듭니다. `index.ts`의 모듈 순서나
  모듈 안의 `rnd()` 호출 순서가 바뀌면 거리 모습이 달라집니다.
- three.js는 원본 프로토타입과 똑같은 화면을 위해 `0.128.0`에 고정했습니다. 올릴 때는 조명 단위와
  색 관리 기본값이 바뀌므로 화면을 비교하며 맞춰야 합니다.
- `world/alley.ts`, `world/house.ts`, `vehicles.ts`는 원본 프로토타입 코드를 거의 그대로 옮겨서
  타입이 느슨합니다(`strict: false`). 새로 만드는 코드부터 타입을 붙여 가면 됩니다.
