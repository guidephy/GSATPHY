(() => {
  const data = window.PHYSICS_QUESTION_BANK;
  const validPages = new Set(["overview", "curriculum", "practice"]);
  const state = { page: "overview", unit: "all", year: "all", search: "", pageIndex: 1, pageSize: 12 };

  const unitFilters = document.getElementById("unitFilters");
  const yearFilters = document.getElementById("yearFilters");
  const searchInput = document.getElementById("searchInput");
  const conceptSuggestions = document.getElementById("conceptSuggestions");
  const clearFilters = document.getElementById("clearFilters");
  const resultCount = document.getElementById("resultCount");
  const questionGrid = document.getElementById("questionGrid");
  const paginationControls = document.getElementById("paginationControls");
  const unitYearHeatmap = document.getElementById("unitYearHeatmap");
  const topConcepts = document.getElementById("topConcepts");
  const unitGuides = document.getElementById("unitGuides");
  const pageSections = [...document.querySelectorAll(".page-section")];
  const pageLinks = [...document.querySelectorAll("[data-page-link]")];
  const routeButtons = [...document.querySelectorAll("[data-route-target]")];
  const questionById = new Map(data.questions.map((question) => [question.id, question]));

  function makeButton(label, value, group, count) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset[group] = value;
    button.textContent = count == null ? label : label + " " + count;
    return button;
  }

  function getHashPage() {
    const value = (window.location.hash || "#overview").replace("#", "");
    return validPages.has(value) ? value : "overview";
  }

  function setActivePage(page) {
    state.page = validPages.has(page) ? page : "overview";
    pageSections.forEach((section) => {
      section.classList.toggle("is-active", section.dataset.page === state.page);
    });
    pageLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.pageLink === state.page);
    });
  }

  function routeTo(page) {
    const nextPage = validPages.has(page) ? page : "overview";
    if (window.location.hash !== "#" + nextPage) {
      window.location.hash = nextPage;
      return;
    }
    setActivePage(nextPage);
  }

  function applyFilters(nextState, shouldOpenPractice) {
    let filtersChanged = false;
    if (Object.prototype.hasOwnProperty.call(nextState, "unit") && state.unit !== nextState.unit) {
      state.unit = nextState.unit;
      filtersChanged = true;
    }
    if (Object.prototype.hasOwnProperty.call(nextState, "year") && state.year !== nextState.year) {
      state.year = nextState.year;
      filtersChanged = true;
    }
    if (Object.prototype.hasOwnProperty.call(nextState, "search")) {
      if (state.search !== nextState.search) filtersChanged = true;
      state.search = nextState.search;
      searchInput.value = nextState.search;
    }
    if (filtersChanged) state.pageIndex = 1;
    renderQuestions();
    if (shouldOpenPractice) routeTo("practice");
  }

  function createList(items, ordered) {
    const list = document.createElement(ordered ? "ol" : "ul");
    list.className = "study-list";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    return list;
  }

  function getUnitConceptCounts(unitId) {
    const counts = new Map();
    data.questions
      .filter((question) => question.unit === unitId)
      .forEach((question) => {
        (question.concepts || [])
          .filter((concept) => concept !== "108課綱物理" && concept !== question.unitName && concept !== question.topic)
          .forEach((concept) => counts.set(concept, (counts.get(concept) || 0) + 1));
      });
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hant"))
      .slice(0, 8);
  }

  function renderDashboard() {
    const maxCount = Math.max(...data.units.flatMap((unit) => data.years.map((year) => data.summary.byUnitYear[unit.id][year] || 0)), 1);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const unitHead = document.createElement("th");
    unitHead.textContent = "單元";
    headRow.append(unitHead);
    data.years.forEach((year) => {
      const th = document.createElement("th");
      th.textContent = year;
      headRow.append(th);
    });
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    data.units.forEach((unit) => {
      const row = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = unit.name;
      row.append(th);
      data.years.forEach((year) => {
        const count = data.summary.byUnitYear[unit.id][year] || 0;
        const td = document.createElement("td");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "heat-cell";
        button.textContent = count ? String(count) : "0";
        button.disabled = count === 0;
        const alpha = count ? 0.16 + (count / maxCount) * 0.66 : 0.04;
        button.style.backgroundColor = "rgba(29, 78, 216, " + alpha.toFixed(2) + ")";
        if (count / maxCount > 0.58) button.style.color = "#fffaf0";
        button.title = unit.name + " " + year + " 年度共 " + count + " 題";
        button.addEventListener("click", () => applyFilters({ unit: unit.id, year, search: "" }, true));
        td.append(button);
        row.append(td);
      });
      tbody.append(row);
    });
    table.append(thead, tbody);
    unitYearHeatmap.replaceChildren(table);

    topConcepts.replaceChildren(
      ...data.summary.topConcepts.map((concept) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = concept.label + " " + concept.count;
        button.addEventListener("click", () => applyFilters({ unit: "all", year: "all", search: concept.label }, true));
        return button;
      }),
    );

    unitGuides.replaceChildren(
      ...data.units.map((unit) => {
        const guide = data.unitGuides[unit.id];
        const card = document.createElement("article");
        card.className = "unit-guide-card";

        const title = document.createElement("h3");
        title.textContent = guide.title;
        const overview = document.createElement("p");
        overview.textContent = guide.overview;

        const goalsTitle = document.createElement("strong");
        goalsTitle.textContent = "學習目標";
        const goals = createList(guide.studyGoals.slice(0, 3), false);

        const trapsTitle = document.createElement("strong");
        trapsTitle.textContent = "常見錯誤";
        const traps = createList(guide.traps.slice(0, 2), false);

        const concepts = document.createElement("div");
        concepts.className = "mini-concepts";
        getUnitConceptCounts(unit.id).forEach((concept) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = concept.label + " " + concept.count;
          button.addEventListener("click", () => applyFilters({ unit: unit.id, year: "all", search: concept.label }, true));
          concepts.append(button);
        });

        const actions = document.createElement("div");
        actions.className = "card-actions";
        const practice = document.createElement("button");
        practice.type = "button";
        practice.textContent = "練習本單元 " + (data.summary.byUnit[unit.id] || 0) + " 題";
        practice.addEventListener("click", () => applyFilters({ unit: unit.id, year: "all", search: "" }, true));
        actions.append(practice);

        card.append(title, overview, goalsTitle, goals, trapsTitle, traps, concepts, actions);
        return card;
      }),
    );
  }

  function renderFilterButtons() {
    unitFilters.replaceChildren();
    unitFilters.append(makeButton("全部單元", "all", "unit", data.summary.total));
    data.units.forEach((unit) => {
      unitFilters.append(makeButton(unit.name, unit.id, "unit", data.summary.byUnit[unit.id] || 0));
    });

    yearFilters.replaceChildren();
    yearFilters.append(makeButton("全部年度", "all", "year", data.summary.total));
    data.years.forEach((year) => {
      yearFilters.append(makeButton(year, year, "year", data.summary.byYear[year] || 0));
    });

    const concepts = [...new Set(data.questions.flatMap((question) => question.concepts || []))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    conceptSuggestions.replaceChildren(
      ...concepts.map((concept) => {
        const option = document.createElement("option");
        option.value = concept;
        return option;
      }),
    );
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  }

  function getFilteredQuestions() {
    const keyword = normalize(state.search);
    return data.questions.filter((question) => {
      if (state.unit !== "all" && question.unit !== state.unit) return false;
      if (state.year !== "all" && question.year !== state.year) return false;
      if (!keyword) return true;
      return normalize(question.searchText).includes(keyword);
    });
  }

  function syncActiveButtons() {
    unitFilters.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.unit === state.unit);
    });
    yearFilters.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.year === state.year);
    });
  }

  function buildMeta(question) {
    const bar = document.createElement("div");
    bar.className = "question-card__bar";
    const meta = document.createElement("div");
    meta.className = "question-card__meta";

    const idBadge = document.createElement("span");
    idBadge.className = "badge";
    idBadge.textContent = question.year + " 第 " + question.q + " 題";
    const unitBadge = document.createElement("span");
    unitBadge.className = "badge badge--unit";
    unitBadge.textContent = question.unitName;
    const modeBadge = document.createElement("span");
    modeBadge.className = "badge";
    modeBadge.textContent = question.answerMode === "nonchoice" ? "非選題" : question.answerMode === "multiple" ? "多選題" : "單選題";
    meta.append(idBadge, unitBadge, modeBadge);

    if (question.hasGroup) {
      const groupBadge = document.createElement("span");
      groupBadge.className = "badge";
      groupBadge.textContent = "題組";
      meta.append(groupBadge);
    }

    bar.append(meta);
    return bar;
  }

  function buildImage(question) {
    const link = document.createElement("a");
    link.className = "question-card__image";
    link.href = question.image;
    link.target = "_blank";
    link.rel = "noreferrer";
    const image = document.createElement("img");
    image.src = question.image;
    image.alt = question.year + " 學測自然科第 " + question.q + " 題截圖";
    image.loading = "lazy";
    link.append(image);
    return link;
  }

  function getSelectedAnswer(panel) {
    return [...panel.querySelectorAll(".choice-option.is-selected")]
      .map((button) => button.dataset.value)
      .sort()
      .join("");
  }

  function setFeedback(node, message, type) {
    node.textContent = message;
    node.classList.toggle("is-correct", type === "correct");
    node.classList.toggle("is-wrong", type === "wrong");
  }

  function appendLearningBlock(parent, title, content, ordered) {
    if (!content || (Array.isArray(content) && !content.length)) return;
    const block = document.createElement("section");
    block.className = "learning-block";
    const heading = document.createElement("h4");
    heading.textContent = title;
    block.append(heading);

    if (Array.isArray(content)) {
      block.append(createList(content, ordered));
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      block.append(paragraph);
    }

    parent.append(block);
  }

  function appendConceptChips(parent, question) {
    const concepts = (question.concepts || []).filter((concept) => concept !== "108課綱物理" && concept !== question.unitName);
    if (!concepts.length) return;
    const block = document.createElement("section");
    block.className = "learning-block";
    const heading = document.createElement("h4");
    heading.textContent = "對應概念";
    const row = document.createElement("div");
    row.className = "mini-concepts";
    concepts.forEach((concept) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "concept-chip";
      chip.textContent = concept;
      chip.addEventListener("click", () => applyFilters({ unit: "all", year: "all", search: concept }, true));
      row.append(chip);
    });
    block.append(heading, row);
    parent.append(block);
  }

  function appendSimilarQuestions(parent, question) {
    const similar = (question.similarQuestionIds || []).map((id) => questionById.get(id)).filter(Boolean);
    if (!similar.length) return;
    const block = document.createElement("section");
    block.className = "learning-block";
    const heading = document.createElement("h4");
    heading.textContent = "相似題練習";
    const row = document.createElement("div");
    row.className = "similar-row";
    similar.forEach((target) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = target.year + " 第 " + target.q + " 題";
      button.title = target.unitName + "： " + target.topic;
      button.addEventListener("click", () => applyFilters({ unit: "all", year: "all", search: target.year + "-" + target.q }, true));
      row.append(button);
    });
    block.append(heading, row);
    parent.append(block);
  }

  function buildAnswerDetail(question) {
    const detail = document.createElement("details");
    detail.className = "answer-detail";
    const summary = document.createElement("summary");
    summary.textContent = "查看答案與詳解";
    const body = document.createElement("div");
    body.className = "answer-detail__body";

    const answerLine = document.createElement("p");
    const answerStrong = document.createElement("strong");
    answerStrong.textContent = "官方答案：";
    answerLine.append(answerStrong, document.createTextNode(question.answerLabel || "未擷取到答案"));
    body.append(answerLine);

    const modeLine = document.createElement("p");
    const modeStrong = document.createElement("strong");
    modeStrong.textContent = "作答型態：";
    modeLine.append(
      modeStrong,
      document.createTextNode(question.answerMode === "nonchoice" ? "非選擇題" : question.answerMode === "multiple" ? "多選題" : "單選題"),
    );
    body.append(modeLine);

    if (question.answerMode === "nonchoice" && question.officialReference) {
      const refTitle = document.createElement("p");
      const refStrong = document.createElement("strong");
      refStrong.textContent = "官方參考答案與評分原則：";
      refTitle.append(refStrong);
      const ref = document.createElement("pre");
      ref.textContent = question.officialReference;
      body.append(refTitle, ref);
    } else {
      const explanation = document.createElement("p");
      const explanationStrong = document.createElement("strong");
      explanationStrong.textContent = "詳解：";
      explanation.append(explanationStrong, document.createTextNode(question.explanation));
      body.append(explanation);
    }

    if (question.learningGuide) {
      appendLearningBlock(body, "課綱連結", question.learningGuide.curriculum);
      appendLearningBlock(body, "考點定位", question.learningGuide.examPoint);
      appendConceptChips(body, question);
      appendLearningBlock(body, "自學解題流程", question.learningGuide.strategy, true);
      appendLearningBlock(body, "常見錯誤", question.learningGuide.traps, false);
      appendLearningBlock(body, "訂正建議", question.learningGuide.selfStudy);
      appendSimilarQuestions(body, question);
    }

    detail.append(summary, body);
    return detail;
  }

  function buildAnswerPanel(question) {
    const panel = document.createElement("div");
    panel.className = "answer-panel";

    const mode = document.createElement("p");
    mode.className = "answer-mode";
    mode.textContent =
      question.answerMode === "nonchoice"
        ? "非選擇題：先自行作答，再展開官方參考答案。"
        : question.answerMode === "multiple"
          ? "多選題：可選多個選項。"
          : "單選題：只能選一個選項。";
    panel.append(mode);

    const feedback = document.createElement("span");
    feedback.className = "feedback";
    const detail = buildAnswerDetail(question);

    if (question.answerMode === "nonchoice") {
      const textarea = document.createElement("textarea");
      textarea.placeholder = "在這裡寫下你的作答，再點下方按鈕查看參考答案。";
      const actions = document.createElement("div");
      actions.className = "answer-actions";
      const reveal = document.createElement("button");
      reveal.type = "button";
      reveal.textContent = "查看參考答案";
      reveal.addEventListener("click", () => {
        detail.open = true;
        setFeedback(feedback, "已展開官方參考答案，請自行對照評分原則訂正。", "correct");
      });
      actions.append(reveal, feedback);
      panel.append(textarea, actions, detail);
      return panel;
    }

    const choices = document.createElement("div");
    choices.className = "choice-row";
    question.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-option";
      button.dataset.value = option;
      button.textContent = option;
      button.addEventListener("click", () => {
        if (question.answerMode === "single") {
          choices.querySelectorAll(".choice-option").forEach((item) => item.classList.remove("is-selected"));
        }
        button.classList.toggle("is-selected");
        setFeedback(feedback, "", "");
      });
      choices.append(button);
    });

    const actions = document.createElement("div");
    actions.className = "answer-actions";
    const check = document.createElement("button");
    check.type = "button";
    check.textContent = "核對作答";
    check.addEventListener("click", () => {
      const selected = getSelectedAnswer(panel);
      if (!selected) {
        setFeedback(feedback, "尚未選答案。", "wrong");
        return;
      }
      const expected = String(question.answer || "").split("").sort().join("");
      if (selected === expected) {
        setFeedback(feedback, "作答正確。", "correct");
      } else {
        setFeedback(feedback, "作答不正確，可展開答案與詳解訂正。", "wrong");
      }
    });
    actions.append(check, feedback);
    panel.append(choices, actions, detail);
    return panel;
  }

  function renderPagination(totalItems, totalPages) {
    paginationControls.replaceChildren();
    if (totalItems === 0 || totalPages <= 1) return;

    const addPageButton = (label, page, options = {}) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.disabled = Boolean(options.disabled);
      button.classList.toggle("is-active", Boolean(options.active));
      button.addEventListener("click", () => {
        if (button.disabled) return;
        state.pageIndex = page;
        renderQuestions();
        document.getElementById("practice").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      paginationControls.append(button);
    };

    addPageButton("上一頁", Math.max(1, state.pageIndex - 1), { disabled: state.pageIndex === 1 });
    const start = Math.max(1, state.pageIndex - 2);
    const end = Math.min(totalPages, state.pageIndex + 2);
    if (start > 1) {
      addPageButton("1", 1);
      if (start > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.className = "muted";
        paginationControls.append(ellipsis);
      }
    }
    for (let page = start; page <= end; page += 1) {
      addPageButton(String(page), page, { active: page === state.pageIndex });
    }
    if (end < totalPages) {
      if (end < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.className = "muted";
        paginationControls.append(ellipsis);
      }
      addPageButton(String(totalPages), totalPages);
    }
    addPageButton("下一頁", Math.min(totalPages, state.pageIndex + 1), { disabled: state.pageIndex === totalPages });
  }

  function renderQuestions() {
    syncActiveButtons();
    const questions = getFilteredQuestions();
    const totalPages = Math.max(1, Math.ceil(questions.length / state.pageSize));
    state.pageIndex = Math.min(Math.max(1, state.pageIndex), totalPages);
    const start = (state.pageIndex - 1) * state.pageSize;
    const pageQuestions = questions.slice(start, start + state.pageSize);
    const visibleStart = questions.length ? start + 1 : 0;
    const visibleEnd = start + pageQuestions.length;
    resultCount.textContent = "目前顯示第 " + visibleStart + "-" + visibleEnd + " 題，共 " + questions.length + " 題符合條件；題庫總數 " + data.summary.total + " 題";
    questionGrid.replaceChildren();

    if (!questions.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "沒有符合條件的題目。";
      questionGrid.append(empty);
      renderPagination(0, 1);
      return;
    }

    pageQuestions.forEach((question, index) => {
      const card = document.createElement("article");
      card.className = "question-card";
      card.style.animationDelay = Math.min(index, 10) * 28 + "ms";

      card.append(buildMeta(question), buildImage(question), buildAnswerPanel(question));
      questionGrid.append(card);
    });

    renderPagination(questions.length, totalPages);
  }

  unitFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-unit]");
    if (!button) return;
    applyFilters({ unit: button.dataset.unit }, false);
  });

  yearFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-year]");
    if (!button) return;
    applyFilters({ year: button.dataset.year }, false);
  });

  searchInput.addEventListener("input", () => {
    applyFilters({ search: searchInput.value }, false);
  });

  clearFilters.addEventListener("click", () => {
    applyFilters({ unit: "all", year: "all", search: "" }, false);
  });

  routeButtons.forEach((button) => {
    button.addEventListener("click", () => routeTo(button.dataset.routeTarget));
  });

  window.addEventListener("hashchange", () => {
    setActivePage(getHashPage());
  });

  renderDashboard();
  renderFilterButtons();
  setActivePage(getHashPage());
  renderQuestions();
})();
