document.addEventListener("DOMContentLoaded", () => {
    const app = document.querySelector(".app");
    const startButton = document.getElementById("startButton");
    const warningText = document.getElementById("warningText");
    const popupContainer = document.getElementById("popupContainer");
    const clickCountDisplay = document.getElementById("clickCountDisplay");
    const phaseLabel = document.getElementById("phaseLabel");
    const escapeLayer = document.getElementById("escapeLayer");
    const escapeExitButton = document.getElementById("escapeExitButton");
    const fakeExitBtn = document.getElementById("fakeExitBtn");
    const darkLayer = document.getElementById("darkLayer");

    const headerEl = document.querySelector(".header");
    const barEl = document.querySelector(".fake-system-bar");

    let clickCount = 0;
    let started = false;
    let fakeEscapeShown = false;
    let realEscapeUnlocked = false;

    // 팝업이 겹쳐 쌓일 포인트 (EXIT/뒤로가기 근처 느낌)
    const STACK_POINT = {
        topVh: 60,
        leftVw: 12
    };

    /* ---------- 공통 유틸 ---------- */

    function triggerShake() {
        app.classList.add("shake");
        setTimeout(() => {
            app.classList.remove("shake");
        }, 150);
    }

    // 화면이 점점 검게 변하도록 업데이트
    function updateDarkness() {
        if (!darkLayer) return;
        const maxOpacity = 0.7; // 최대 어두운 정도
        const ratio = Math.min(clickCount / 100, 1); // 0~100클릭 사이에서 0~1
        const opacity = ratio * maxOpacity;
        darkLayer.style.background = `rgba(0, 0, 0, ${opacity.toFixed(2)})`;
    }

    function registerClick() {
        clickCount++;
        clickCountDisplay.textContent = `클릭 ${clickCount}회`;

        if (clickCount >= 50) {
            document.body.classList.add("glitch");
        }
        if (clickCount >= 15) {
            triggerShake();
        }

        updateDarkness();
        updatePhase();

        // 100클릭 이상이면 진짜 나가기 버튼 언락
        if (!realEscapeUnlocked && clickCount >= 100) {
            unlockRealEscape();
        }

        // 교수님이 준 클릭 집계 코드가 있다면 여기서 호출
        if (typeof window.registerClick === "function") {
            window.registerClick();
        }
    }

    function updatePhase() {
        let text = "상태: 안정";
        if (clickCount >= 20) text = "상태: 불안정";
        if (clickCount >= 50) text = "상태: 오류 확산";
        if (clickCount >= 100) text = "상태: 탈출 불가";
        phaseLabel.textContent = text;
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function popupText() {
        if (clickCount < 20) return "시스템에 오류가 발생했습니다.";
        if (clickCount < 50) return "닫지 마세요.";
        if (clickCount < 100) return "탈출 시도가 감지되었습니다.";
        return "이미 안쪽까지 들어왔습니다.";
    }

    /* ---------- 팝업 생성 ---------- */

    // mode: "random" (여기저기), "stack" (한 포인트에 겹침)
    function createPopup(alert = false, mode = "random") {
        const popup = document.createElement("div");
        popup.className = "popup" + (alert ? " alert" : "");

        const header = document.createElement("div");
        header.className = "popup-header";
        header.textContent = "SYSTEM ERROR";

        const body = document.createElement("div");
        body.className = "popup-body";
        body.textContent = popupText();

        const footer = document.createElement("div");
        footer.className = "popup-footer";

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "닫기";

        closeBtn.addEventListener("click", () => {
            registerClick();
            popup.remove();

            const remaining = popupContainer.children.length;

            // 초반 착각 구간: 몇 개만 닫으면 싹 정리된 것처럼
            if (clickCount <= 8 && remaining <= 2) {
                while (popupContainer.firstChild) {
                    popupContainer.removeChild(popupContainer.firstChild);
                }
                warningText.textContent = "정상 상태로 복구되었습니다.";

                setTimeout(() => {
                    warningText.textContent = "…그렇게 보일 뿐입니다.";
                    spawnMore(); // 다시 슬금슬금 생성
                }, 1500);

                return;
            }

            // 팝업을 다 지웠고, 클릭도 어느 정도 했으면 가짜 탈출
            if (!fakeEscapeShown && remaining === 0 && clickCount >= 25) {
                showFakeEscape();
                return;
            }

            spawnMore();
        });

        footer.appendChild(closeBtn);

        popup.appendChild(header);
        popup.appendChild(body);
        popup.appendChild(footer);

        // 일단 DOM에 붙여서 실제 크기 측정
        popup.style.top = "0px";
        popup.style.left = "0px";
        popup.style.visibility = "hidden";
        popupContainer.appendChild(popup);

        const rect = popup.getBoundingClientRect();
        const popupW = rect.width;
        const popupH = rect.height;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8; // 화면 끝에서 최소 여백

        // 상단(헤더)과 하단(EXIT 바)을 피하기 위한 안전 영역 계산
        let safeTopMin = margin;
        let safeTopMax = vh - popupH - margin;

        if (headerEl && barEl) {
            const headerRect = headerEl.getBoundingClientRect();
            const barRect = barEl.getBoundingClientRect();

            safeTopMin = headerRect.bottom + margin;          // 헤더 아래부터
            safeTopMax = barRect.top - popupH - margin;       // EXIT 바 위까지

            // 만약 공간이 너무 좁으면(혹은 역전되면) 그냥 기본값으로 롤백
            if (safeTopMax <= safeTopMin + 20) {
                safeTopMin = margin + 40;
                safeTopMax = vh - popupH - (margin + 40);
            }
            // 그래도 이상하면 전체 화면 기준 최소/최대로 한 번 더 보정
            safeTopMin = Math.max(margin, safeTopMin);
            safeTopMax = Math.min(vh - popupH - margin, safeTopMax);
            if (safeTopMax < safeTopMin) {
                safeTopMin = margin;
                safeTopMax = vh - popupH - margin;
            }
        }

        let topPx;
        let leftPx;

        if (mode === "stack") {
            // STACK_POINT는 vh/vw 기준이라 px로 변환
            const baseTop = (STACK_POINT.topVh / 100) * vh;
            const baseLeft = (STACK_POINT.leftVw / 100) * vw;

            topPx = baseTop + random(-10, 10);
            leftPx = baseLeft + random(-16, 16);
        } else {
            // 랜덤 배치 – 항상 안전 영역 안에 들어오게
            topPx = random(safeTopMin, safeTopMax);
            leftPx = random(margin, vw - popupW - margin);
        }

        // 화면 밖으로 튀어나가는 경우 클램프
        topPx = Math.max(margin, Math.min(topPx, vh - popupH - margin));
        leftPx = Math.max(margin, Math.min(leftPx, vw - popupW - margin));

        popup.style.top = `${topPx}px`;
        popup.style.left = `${leftPx}px`;

        // 스택 모드일 때만 살짝 회전 + 높은 z-index
        if (mode === "stack") {
            const rotateDeg = random(-4, 4);
            popup.style.transform = `rotate(${rotateDeg}deg)`;
            popup.style.zIndex = 200 + Math.floor(Math.random() * 200);
        } else {
            popup.style.zIndex = 100 + Math.floor(Math.random() * 100);
        }

        popup.style.visibility = "visible";
    }

    // 팝업 여러 개 뿌리기
    function spawnMore(fromExit = false) {
        let count = 2;
        if (clickCount > 40) count = 3;
        if (clickCount > 80) count = 4;
        if (fromExit) count += 2;

        for (let i = 0; i < count; i++) {
            let useStack = false;

            if (clickCount >= 30 && clickCount < 60) {
                useStack = Math.random() < 0.5;
            } else if (clickCount >= 60) {
                useStack = Math.random() < 0.75;
            }

            if (fromExit) {
                useStack = true;
            }

            const mode = useStack ? "stack" : "random";
            const isAlert = clickCount > 50;
            createPopup(isAlert, mode);
        }
    }

    /* ---------- 가짜 탈출 / EXIT 메시지 ---------- */

    function showFakeEscape() {
        fakeEscapeShown = true;
        escapeLayer.classList.remove("hidden");
    }

    escapeExitButton.addEventListener("click", () => {
        registerClick();
        escapeLayer.classList.add("hidden");

        // 진짜 탈출인 척 하다가 팝업 폭발
        for (let i = 0; i < 20; i++) {
            const useStack = i % 2 === 0;
            const mode = useStack ? "stack" : "random";
            createPopup(true, mode);
        }
    });

    function showExitMessage() {
        const msg = document.createElement("div");
        msg.className = "exit-message";

        const texts = [
            "아직이야. 더 놀자.",
            "지금 나가면 손해인데?",
            "EXIT는 아직 작동하지 않습니다."
        ];
        msg.textContent = texts[Math.floor(Math.random() * texts.length)];

        document.body.appendChild(msg);
        setTimeout(() => {
            msg.remove();
        }, 1200);
    }

    fakeExitBtn.addEventListener("click", () => {
        registerClick();
        showExitMessage();
        spawnMore(true); // EXIT는 거의 다 스택 모드
    });

    /* ---------- 진짜 탈출 (100클릭 이후 언락) ---------- */

    function unlockRealEscape() {
        realEscapeUnlocked = true;

        const escapeBtn = document.createElement("button");
        escapeBtn.className = "real-exit-btn";
        escapeBtn.textContent = "진짜 나가기";

        escapeBtn.addEventListener("click", () => {
            registerClick();

            // 마지막 화면 연출
            document.body.innerHTML = `
        <div style="
          display:flex;
          justify-content:center;
          align-items:center;
          width:100vw;
          height:100vh;
          background:#000000;
          color:#f5f5f5;
          font-size:1.1rem;
          text-align:center;
          line-height:1.6;
          padding:16px;
        ">
          마지막 화면입니다.<br/>
          여기까지 온 클릭 수: ${clickCount}회<br/><br/>
          보상은 당신입니다.<br/>
          친구에게 공유하고 놀려주세요!
        </div>
      `;
        });

        document.body.appendChild(escapeBtn);
    }

    /* ---------- 뒤로가기 경고 (popstate) ---------- */

    function showBackWarningOverlay() {
        const layer = document.createElement("div");
        layer.className = "back-overlay";

        const box = document.createElement("div");
        box.className = "back-box";
        box.innerHTML = `
      지금 나가면<br/>
      여기서 쌓은 클릭이 모두 사라집니다.<br/><br/>
      그래도 나가고 싶다면<br/>
      뒤로가기를 한 번 더 누르세요.
    `;

        const stayBtn = document.createElement("button");
        stayBtn.textContent = "돌아갈래";

        stayBtn.addEventListener("click", () => {
            layer.remove();
        });

        box.appendChild(stayBtn);
        layer.appendChild(box);
        document.body.appendChild(layer);
    }

    /* ---------- 시작 버튼 ---------- */

    startButton.addEventListener("click", () => {
        if (started) return;
        started = true;

        registerClick();
        startButton.style.display = "none";
        warningText.textContent = "닫으면 끝날 거라고 생각하나요?";

        // 첫 팝업들
        for (let i = 0; i < 3; i++) {
            createPopup(false, "random");
        }
    });

    /* ---------- 뒤로가기/페이지 이탈 관련 초기 설정 ---------- */

    // 히스토리 하나 쌓아두기 (뒤로가기 한 번 가로채기용)
    history.pushState({ inGame: true }, "", location.href);

    window.addEventListener("popstate", (event) => {
        if (event.state && event.state.inGame) {
            history.pushState({ inGame: true }, "", location.href);
            showBackWarningOverlay();
        }
    });

    // 페이지를 떠날 때 브라우저 기본 경고 띄우기
    window.addEventListener("beforeunload", (e) => {
        e.preventDefault();
        e.returnValue = "이 페이지를 진짜로 떠나겠습니까?";
    });
});