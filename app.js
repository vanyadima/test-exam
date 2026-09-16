(() => {
  const questions = window.QUIZ_DATA || [];
  const blockNames = {
    1:"Вопросы эксплуатации",
    2:"Кластер серверов Технологической Платформы 1СПредприятие",
    3:"Администрирование серверов с СУБД MS SQL Server",
    4:"Администрирование серверов с СУБД PostgreSQL",
    5:"Администрирование серверов с СУБД Oracle",
    6:"Настройка рабочих серверов с ОС Windows",
    7:"Настройка рабочих серверов с ОС Linux",
    8:"Основы администрирования сети",
    9:"Эксплуатация виртуальных сред",
    10:"Технология 1CFresh",
    11:"Технологическая Платформа",
    12:"Мониторинг",
    13:"Кластер серверов 8.4",
    14:"Общие вопросы"
  };
  const blockOrder = Object.keys(blockNames).map(Number);
  const $ = (s, r=document) => r.querySelector(s);
  const state = {
    route: location.hash.replace("#","") || "home",
    quiz: null,
    stats: loadStats(),
    theme: localStorage.getItem("quiz-theme") || "dark"
  };
  document.documentElement.classList.toggle("light", state.theme === "light");

  function loadStats(){
    try {
      return JSON.parse(sessionStorage.getItem("quiz-stats")) || {
        attempts:0, answers:0, correct:0, bestExam:0,
        categoryBest:{}, marathonBest:0
      };
    } catch { return {attempts:0,answers:0,correct:0,bestExam:0,categoryBest:{},marathonBest:0}; }
  }

  function saveStats(){ sessionStorage.setItem("quiz-stats", JSON.stringify(state.stats)); }

  function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function routeTo(route){
    state.route=route;
    location.hash=route;
    state.quiz=null;
    render();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function pct(correct,total){ return total ? Math.round(correct/total*100) : 0; }

  function render(){
    const app=$("#app");
    if(state.route==="home") renderHome(app);
    else if(state.route==="categories") renderCategories(app);
    else if(state.route==="exam") renderQuizOrStart(app,"exam");
    else if(state.route==="marathon") renderQuizOrStart(app,"marathon");
    else if(state.route.startsWith("category/")) {
      if(state.quiz) renderQuiz(app);
      else renderCategory(app, Number(state.route.split("/")[1]));
    }
    else renderHome(app);
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.route===state.route.split("/")[0]));
  }

  function renderHome(app){
    const best = state.stats.bestExam || 0;
    app.innerHTML = `
      <section class="hero">
        <div class="eyebrow">505 вопросов · 14 блоков</div>
        <h1>Готовься.<br>Отвечай. Сдавай.</h1>
        <p class="lead">Мобильный тренажёр по курсу «Эксплуатация информационных систем». В экзамене — ровно один случайный вопрос из каждого блока.</p>
        <div class="actions">
          <button class="btn primary" data-start="exam">Начать экзамен</button>
          <button class="btn" data-route="categories">Тренироваться по категориям</button>
          <button class="btn" data-start="marathon">Марафон 505</button>
        </div>
      </section>
      <section class="section grid grid-3">
        <div class="card stat"><div><span>Вопросов</span><b>505</b></div><span>полный банк</span></div>
        <div class="card stat"><div><span>Блоков</span><b>14</b></div><span>на экзамене 14</span></div>
        <div class="card stat"><div><span>Лучший экзамен</span><b>${best}/14</b></div><span>${best ? pct(best,14)+"%" : "пока нет"}</span></div>
      </section>
      <section class="section card">
        <div class="section-head"><h2>Как это работает</h2></div>
        <p class="tagline">Каждая попытка перемешивает порядок вопросов и порядок вариантов ответа. Нумерация вопроса остаётся исходной — например, <b>01.05</b>.</p>
        <hr class="sep">
        <div class="grid grid-2">
          <div><b>Экзамен</b><div class="small muted">14 вопросов — по одному из каждого блока.</div></div>
          <div><b>Категория</b><div class="small muted">Все вопросы выбранного блока в случайном порядке.</div></div>
          <div><b>Марафон</b><div class="small muted">Все 505 вопросов без повторов в рамках одной попытки.</div></div>
          <div><b>Прогресс</b><div class="small muted">Результаты и лучший балл сохраняются только в этой вкладке.</div></div>
        </div>
      </section>
    `;
    bindHome();
  }

  function bindHome(){
    document.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>routeTo(b.dataset.route));
    document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>startQuiz(b.dataset.start));
  }

  function renderCategories(app){
    const counts = Object.fromEntries(blockOrder.map(b=>[b,questions.filter(q=>q.block===b).length]));
    app.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">Тренажёр</div><h2>Выбери блок</h2></div><span>${questions.length} вопросов</span></div>
      <input class="search" id="catSearch" placeholder="Поиск по названию блока…" autocomplete="off">
      <div class="section grid" id="catList">
        ${blockOrder.map(b=>`
          <article class="card clickable category-card" data-cat="${b}">
            <div><div class="category-name">${String(b).padStart(2,"0")}. ${escapeHtml(blockNames[b])}</div><div class="category-meta">${counts[b]} вопросов ${state.stats.categoryBest?.[b] != null ? "· лучший результат "+state.stats.categoryBest[b]+"/"+counts[b] : ""}</div></div>
            <span class="pill">›</span>
          </article>
        `).join("")}
      </div>
    `;
    $("#catSearch").oninput = e => {
      const term=e.target.value.toLowerCase().trim();
      document.querySelectorAll("#catList [data-cat]").forEach(c=>{
        c.style.display=c.textContent.toLowerCase().includes(term) ? "" : "none";
      });
    };
    document.querySelectorAll("#catList [data-cat]").forEach(c=>c.onclick=()=>routeTo("category/"+c.dataset.cat));
  }

  function renderCategory(app, block){
    const name=blockNames[block];
    const list=questions.filter(q=>q.block===block);
    if(!list.length){ routeTo("categories"); return; }
    app.innerHTML = `
      <div class="section-head">
        <div><div class="eyebrow">Блок ${String(block).padStart(2,"0")}</div><h2>${escapeHtml(name)}</h2></div>
        <span>${list.length} вопросов</span>
      </div>
      <div class="hero">
        <p class="lead">Вопросы и варианты ответа будут перемешаны при каждой новой попытке.</p>
        <div class="actions"><button class="btn primary" data-start-cat="${block}">Начать тренировку</button></div>
      </div>
      <section class="section grid">
        ${list.slice(0,12).map(q=>`<div class="card"><div class="question-id">${q.id}</div><div>${escapeHtml(q.question)}</div></div>`).join("")}
        ${list.length>12?`<div class="empty">Показаны первые 12 вопросов. В тренировке доступны все ${list.length}.</div>`:""}
      </section>
    `;
    $("[data-start-cat]").onclick=()=>startQuiz("category",block);
  }

  function renderQuizOrStart(app, mode){
    if(!state.quiz){
      const title = mode==="exam" ? "Экзамен · 14 вопросов" : "Марафон · 505 вопросов";
      const text = mode==="exam"
        ? "По одному случайному вопросу из каждого из 14 блоков. Порядок блоков и ответов — случайный."
        : "Все 505 вопросов без повторов в одной попытке. Можно проходить частями — прогресс не сбрасывается при обновлении страницы во время попытки.";
      app.innerHTML=`
        <section class="hero quiz-shell">
          <div class="eyebrow">${mode==="exam"?"Экзаменационный режим":"Полный банк"}</div>
          <h1>${title}</h1>
          <p class="lead">${text}</p>
          <div class="actions"><button class="btn primary" data-start="${mode}">Начать</button><button class="btn" data-route="home">Назад</button></div>
        </section>
      `;
      document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>startQuiz(b.dataset.start));
      $("[data-route]").onclick=()=>routeTo("home");
      return;
    }
    renderQuiz(app);
  }

  function startQuiz(mode, block, mistakePool=null){
    let pool;

    if(mode==="exam"){
      pool=shuffle(blockOrder.map(b=>shuffle(questions.filter(q=>q.block===b))[0]));
    } else if(mode==="category"){
      pool=shuffle(questions.filter(q=>q.block===block));
    } else if(mode==="mistakes"){
      pool=shuffle(mistakePool || []);
    } else {
      pool=shuffle(questions);
    }

    state.quiz={
      mode, block, pool, index:0, score:0, answered:false, started:Date.now(),
      options: null,
      mistakes: [],
      sourceMistakes: mode==="mistakes" ? pool : null
    };

    render();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function renderQuiz(app){
    const q=state.quiz.pool[state.quiz.index];
    const total=state.quiz.pool.length;
    if(!q){ return renderResult(app); }

    if(!state.quiz.options) state.quiz.options=shuffle(q.answers.map((a,i)=>({...a,original:i})));
    const done=state.quiz.index;

    app.innerHTML=`
      <div class="quiz-shell">
        <div class="quiz-top">
          <div><span class="question-id">${q.id}</span><div class="small muted">${escapeHtml(blockNames[q.block])}</div></div>
          <div class="pill">${done+1} / ${total}</div>
        </div>
        <div class="progress"><i style="width:${((done)/total)*100}%"></i></div>
        <article class="question-card">
          <div class="question-text">${escapeHtml(q.question)}</div>
          <div class="option-list">
            ${state.quiz.options.map((a,i)=>`
              <button class="option" data-option="${i}">
                <span class="option-letter">${String.fromCharCode(65+i)}</span>
                <span class="option-text">${escapeHtml(a.text)}</span>
              </button>
            `).join("")}
          </div>
          <div id="feedback"></div>
          <div class="quiz-actions"><button class="btn ghost" id="quitBtn">Выйти</button><button class="btn primary" id="nextBtn" disabled>${done+1===total?"Завершить":"Далее"}</button></div>
        </article>
      </div>
    `;

    document.querySelectorAll("[data-option]").forEach(b=>b.onclick=()=>answerQuestion(Number(b.dataset.option)));
    $("#nextBtn").onclick=nextQuestion;
    $("#quitBtn").onclick=()=>{state.quiz=null;routeTo("home");};
  }

  function answerQuestion(index){
    if(state.quiz.answered) return;
    state.quiz.answered=true;

    const q=state.quiz.pool[state.quiz.index];
    const options=state.quiz.options;
    const picked=options[index];
    const correctIndex=options.findIndex(a=>a.correct);
    const good=picked.correct;

    if(good) state.quiz.score++;
    else if(state.quiz.mode!=="mistakes") state.quiz.mistakes.push(q);

    state.quiz.selected=index;

    document.querySelectorAll(".option").forEach((b,i)=>{
      b.classList.add("disabled");
      if(options[i].correct) b.classList.add("correct");
      if(i===index && !good) b.classList.add("wrong");
    });

    const fb=$("#feedback");
    fb.className="feedback "+(good?"good":"bad");
    fb.innerHTML=good ? "<b>Верно.</b> Переходи дальше." : `<b>Неверно.</b> Правильный вариант: ${escapeHtml(options[correctIndex].text)}`;
    $("#nextBtn").disabled=false;
  }

  function nextQuestion(){
    state.quiz.index++;
    state.quiz.answered=false;
    state.quiz.selected=null;
    state.quiz.options=null;
    if(state.quiz.index>=state.quiz.pool.length) return finishQuiz();
    render();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function finishQuiz(){
    const q=state.quiz;

    if(q.mode!=="mistakes"){
      state.stats.attempts++;
      state.stats.answers+=q.pool.length;
      state.stats.correct+=q.score;

      if(q.mode==="exam") state.stats.bestExam=Math.max(state.stats.bestExam,q.score);
      if(q.mode==="marathon") state.stats.marathonBest=Math.max(state.stats.marathonBest,q.score);
      if(q.mode==="category"){
        const b=q.block;
        state.stats.categoryBest[b]=Math.max(state.stats.categoryBest[b]||0,q.score);
      }

      saveStats();
    }

    q.finished=true;
    render();
  }

  function renderResult(app){
    const q=state.quiz;
    const total=q.pool.length;
    const percent=pct(q.score,total);

    let title;
    let verdict;

    if(q.mode==="mistakes"){
      title="Работа над ошибками завершена";
      verdict = q.score===total ? "Все ошибки исправлены." : "Некоторые вопросы ещё стоит повторить.";
    } else {
      title=q.mode==="exam"?"Экзамен завершён":q.mode==="marathon"?"Марафон завершён":"Тренировка завершена";
      verdict = percent>=90 ? "Отличный результат." : percent>=70 ? "Хороший результат — есть что повторить." : "Есть смысл ещё раз пройти вопросы.";
    }

    const mistakesCount = Array.isArray(q.mistakes) ? q.mistakes.length : 0;
    const workOnMistakesBtn = q.mode!=="mistakes"
      ? `<button class="btn primary" id="mistakesBtn" ${mistakesCount===0?"disabled":""}>Работа над ошибками <span class="result-action-count">${mistakesCount}</span></button>`
      : "";

    app.innerHTML=`
      <section class="card quiz-shell result">
        <div class="eyebrow">${title}</div>
        <div class="score-ring"><b>${q.score}/${total}</b></div>
        <h2>${percent}%</h2>
        <p class="muted">${verdict}</p>
        <div class="grid grid-3 section">
          <div class="card"><div class="kpi">${q.score}</div><div class="small muted">правильных</div></div>
          <div class="card"><div class="kpi">${total-q.score}</div><div class="small muted">ошибок</div></div>
          <div class="card"><div class="kpi">${total}</div><div class="small muted">всего</div></div>
        </div>
        <div class="actions result-actions">
          ${workOnMistakesBtn}
          <button class="btn primary" id="againBtn">Пройти ещё раз</button>
          <button class="btn" data-route="home">На главную</button>
        </div>
      </section>
    `;

    $("#againBtn").onclick=()=>{
      if(q.mode==="category") startQuiz("category",q.block);
      else if(q.mode==="mistakes") startQuiz("mistakes",null,q.sourceMistakes || q.pool);
      else startQuiz(q.mode);
    };

    const mistakesBtn=$("#mistakesBtn");
    if(mistakesBtn){
      mistakesBtn.onclick=()=>startQuiz("mistakes",null,q.mistakes);
    }

    $("[data-route]").onclick=()=>routeTo("home");
  }

  $("#themeBtn").onclick=()=>{
    state.theme=state.theme==="dark"?"light":"dark";
    document.documentElement.classList.toggle("light",state.theme==="light");
    localStorage.setItem("quiz-theme",state.theme);
    $("#themeBtn").textContent=state.theme==="dark"?"☾":"☀";
  };

  window.addEventListener("hashchange",()=>{ state.route=location.hash.replace("#","")||"home"; state.quiz=null; render(); });
  render();
})();
