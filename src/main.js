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
    const hintEl = document.querySelector(".hint");

    let clickCount = 0;
    let started = false;
    let fakeEscapeShown = false;
    let realEscapeUnlocked = false;

    const STACK_POINT = {
        topVh: 60,
        leftVw: 12
    };

    function triggerShake() {
        app.classList.add("shake");
        setTimeout(() => {
            app.classList.remove("shake");
        }, 150);
    }

    function updateDarkness() {
        if (!darkLayer) return;
        const maxOpacity = 0.7;
        const ratio = Math.min(clickCount / 100, 1);
        const opacity = ratio * maxOpacity;
        darkLayer.style.background = `rgba(0, 0, 0, ${opacity.toFixed(2)})`;
    }

    function updateRewardHint() {
        if (!hintEl) return;
        if (clickCount < 20) {
            hintEl.textContent =
                "100클릭 이상이면 토스 보상(추첨) 화면이 열립니다.";
        } else if (clickCount < 60) {
            hintEl.textContent =
                `토스 보상까지 ${100 - clickCount}클릭 남았습니다.`;
        } else if (clickCount < 100) {
            hintEl.textContent =
                `거의 다 왔어요. 보상까지 ${100 - clickCount}클릭.`;
        } else {
            hintEl.textContent = "마지막 화면이 열렸습니다. 오른쪽 위를 확인하세요.";
        }
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
        updateRewardHint();

        if (!realEscapeUnlocked && clickCount >= 100) {
            unlockRealEscape();
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
        if (clickCount < 20) {
            return "시스템에 오류가 발생했습니다.\n닫으면 해결될지도 모릅니다.";
        }
        if (clickCount < 50) {
            return "닫지 말라고 했습니다.\n이미 기록되고 있습니다.";
        }
        if (clickCount < 100) {
            return "탈출 시도가 감지되었습니다.\n토스 보상을 포기하시겠습니까?";
        }
        return "이미 안쪽까지 들어왔습니다.\n오른쪽 위를 확인하세요.";
    }

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

            if (clickCount <= 8 && remaining <= 2) {
                while (popupContainer.firstChild) {
                    popupContainer.removeChild(popupContainer.firstChild);
                }
                warningText.textContent = "정상 상태로 복구되었습니다.";

                setTimeout(() => {
                    warningText.textContent =
                        "…그렇게 보일 뿐입니다. 닫을수록 보상에 가까워집니다.";
                    spawnMore();
                }, 1500);
                return;
            }

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

        popup.style.top = "0px";
        popup.style.left = "0px";
        popup.style.visibility = "hidden";
        popupContainer.appendChild(popup);

        const rect = popup.getBoundingClientRect();
        const popupW = rect.width;
        const popupH = rect.height;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;

        let safeTopMin = margin;
        let safeTopMax = vh - popupH - margin;

        if (headerEl && barEl) {
            const headerRect = headerEl.getBoundingClientRect();
            const barRect = barEl.getBoundingClientRect();

            safeTopMin = headerRect.bottom + margin;
            safeTopMax = barRect.top - popupH - margin;

            if (safeTopMax <= safeTopMin + 20) {
                safeTopMin = margin + 40;
                safeTopMax = vh - popupH - (margin + 40);
            }
            safeTopMin = Math.max(margin, safeTopMin);
            safeTopMax = Math.min(vh - popupH - margin, safeTopMax);
            if (safeTopMax < safeTopMin) {
                safeTopMin = margin;
                safeTopMax = vh - popupH - margin;
            }
        }

        let topPx, leftPx;

        if (mode === "stack") {
            const baseTop = (STACK_POINT.topVh / 100) * vh;
            const baseLeft = (STACK_POINT.leftVw / 100) * vw;
            topPx = baseTop + random(-10, 10);
            leftPx = baseLeft + random(-16, 16);
        } else {
            topPx = random(safeTopMin, safeTopMax);
            leftPx = random(margin, vw - popupW - margin);
        }

        topPx = Math.max(margin, Math.min(topPx, vh - popupH - margin));
        leftPx = Math.max(margin, Math.min(leftPx, vw - popupW - margin));

        popup.style.top = `${topPx}px`;
        popup.style.left = `${leftPx}px`;

        if (mode === "stack") {
            const rotateDeg = random(-4, 4);
            popup.style.transform = `rotate(${rotateDeg}deg)`;
            popup.style.zIndex = 200 + Math.floor(Math.random() * 200);
        } else {
            popup.style.zIndex = 100 + Math.floor(Math.random() * 100);
        }

        popup.style.visibility = "visible";
    }

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

            if (fromExit) useStack = true;

            const mode = useStack ? "stack" : "random";
            const isAlert = clickCount > 50;
            createPopup(isAlert, mode);
        }
    }

    function showFakeEscape() {
        fakeEscapeShown = true;
        escapeLayer.classList.remove("hidden");
    }

    escapeExitButton.addEventListener("click", () => {
        registerClick();
        escapeLayer.classList.add("hidden");

        for (let i = 0; i < 20; i++) {
            const mode = i % 2 === 0 ? "stack" : "random";
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
        spawnMore(true);
    });

    function unlockRealEscape() {
        realEscapeUnlocked = true;

        const escapeBtn = document.createElement("button");
        escapeBtn.className = "real-exit-btn";
        escapeBtn.textContent = "진짜 나가기";

        escapeBtn.addEventListener("click", () => {
            registerClick();
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
          이제 정말 끝입니다.
        </div>
      `;
        });

        document.body.appendChild(escapeBtn);
    }

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

    function startGame() {
        if (started) return;
        started = true;

        registerClick();
        if (startButton) startButton.style.display = "none";
        warningText.textContent =
            "닫을수록 깊어집니다. 토스 보상까지 버텨보세요.";

        for (let i = 0; i < 4; i++) {
            createPopup(false, "random");
        }

        setInterval(() => {
            if (!document.body.contains(app)) return;
            if (popupContainer.children.length < 8) {
                spawnMore();
            }
        }, 3500);
    }

    startButton.addEventListener("click", startGame);
    setTimeout(startGame, 800);

    history.pushState({ inGame: true }, "", location.href);

    window.addEventListener("popstate", (event) => {
        if (event.state && event.state.inGame) {
            history.pushState({ inGame: true }, "", location.href);
            showBackWarningOverlay();
        }
    });

    window.addEventListener("beforeunload", (e) => {
        e.preventDefault();
        e.returnValue = "이 페이지를 진짜로 떠나겠습니까?";
    });

    updateRewardHint();
});
