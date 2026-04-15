// 主应用逻辑
let currentScreen = 'home';
let currentKnowledgeModule = 'train';
let quizConfig = {
    count: 20,
    modules: ['train', 'inference', 'network'],
    difficulties: ['medium', 'advanced']
};
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = 0;

// ========== 导航函数 ==========
function showHome() {
    hideAllScreens();
    document.getElementById('homeScreen').classList.remove('hidden');
    currentScreen = 'home';
}

function showKnowledge() {
    hideAllScreens();
    document.getElementById('knowledgeScreen').classList.remove('hidden');
    currentScreen = 'knowledge';
    renderKnowledgeNav();
    loadKnowledge(currentKnowledgeModule);
}

function showQuizConfig() {
    hideAllScreens();
    document.getElementById('quizConfigScreen').classList.remove('hidden');
    currentScreen = 'config';
}

function showQuiz() {
    hideAllScreens();
    document.getElementById('quizScreen').classList.remove('hidden');
    currentScreen = 'quiz';
}

function showResult() {
    hideAllScreens();
    document.getElementById('resultScreen').classList.remove('hidden');
    currentScreen = 'result';
    renderResult();
}

function showStats() {
    hideAllScreens();
    document.getElementById('statsScreen').classList.remove('hidden');
    currentScreen = 'stats';
}

function hideAllScreens() {
    const screens = ['homeScreen', 'knowledgeScreen', 'quizConfigScreen', 
                     'quizScreen', 'resultScreen', 'statsScreen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

// ========== 知识库功能 ==========
function renderKnowledgeNav() {
    const nav = document.getElementById('knowledgeNav');
    nav.innerHTML = '';
    
    Object.keys(knowledgeBase).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn' + (key === currentKnowledgeModule ? ' active' : '');
        btn.textContent = knowledgeBase[key].name;
        btn.onclick = () => loadKnowledge(key);
        nav.appendChild(btn);
    });
}

function loadKnowledge(module) {
    currentKnowledgeModule = module;
    const content = document.getElementById('knowledgeContent');
    content.innerHTML = knowledgeBase[module].content;
    
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// ========== 测验配置功能 ==========
function updateSliderValue(slider) {
    const valueSpan = document.getElementById(slider.id + 'Value');
    valueSpan.textContent = slider.value;
}

function startQuiz() {
    // 获取配置
    quizConfig.count = parseInt(document.getElementById('questionCount').value);
    
    // 获取选中的模块
    quizConfig.modules = [];
    ['train', 'inference', 'network'].forEach(module => {
        if (document.getElementById(`module-${module}`).checked) {
            quizConfig.modules.push(module);
        }
    });
    
    // 获取选中的难度
    quizConfig.difficulties = [];
    ['medium', 'advanced', 'expert'].forEach(diff => {
        if (document.getElementById(`diff-${diff}`).checked) {
            quizConfig.difficulties.push(diff);
        }
    });
    
    // 验证配置
    if (quizConfig.modules.length === 0) {
        alert('请至少选择一个模块!');
        return;
    }
    
    if (quizConfig.difficulties.length === 0) {
        alert('请至少选择一个难度!');
        return;
    }
    
    // 筛选题目
    const filteredQuestions = questionBank.filter(q => 
        quizConfig.modules.includes(q.module) && 
        quizConfig.difficulties.includes(q.difficulty)
    );
    
    if (filteredQuestions.length < quizConfig.count) {
        alert(`符合条件的题目只有${filteredQuestions.length}道,已自动调整题目数量!`);
        quizConfig.count = filteredQuestions.length;
    }
    
    // 随机抽取题目
    quizQuestions = shuffleArray(filteredQuestions).slice(0, quizConfig.count);
    
    // 重置状态
    currentQuestionIndex = 0;
    userAnswers = new Array(quizQuestions.length).fill(null);
    quizStartTime = Date.now();
    
    // 显示测验界面
    showQuiz();
    renderQuestion();
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ========== 测验界面功能 ==========
function renderQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    const card = document.getElementById('questionCard');
    
    // 更新进度
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = 
        `${currentQuestionIndex + 1}/${quizQuestions.length}`;
    
    // 难度中文
    const diffMap = {
        'medium': '中级',
        'advanced': '高级',
        'expert': '专家'
    };
    
    // 模块中文
    const moduleMap = {
        'train': '训练',
        'inference': '推理',
        'network': '网络'
    };
    
    // 渲染题目
    card.innerHTML = `
        <div class="question-header">
            <span class="question-number">第 ${currentQuestionIndex + 1} 题</span>
            <div>
                <span class="question-type">${moduleMap[question.module]}</span>
                <span class="question-type" style="background: #764ba2; margin-left: 10px;">
                    ${diffMap[question.difficulty]}
                </span>
            </div>
        </div>
        <div class="question-text">${question.question}</div>
        <div class="options" id="options"></div>
    `;
    
    // 渲染选项
    const optionsDiv = document.getElementById('options');
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        if (userAnswers[currentQuestionIndex] === index) {
            optionDiv.classList.add('selected');
        }
        optionDiv.innerHTML = `
            <div class="option-letter">${String.fromCharCode(65 + index)}</div>
            <div>${option}</div>
        `;
        optionDiv.onclick = () => selectOption(index);
        optionsDiv.appendChild(optionDiv);
    });
    
    // 更新按钮
    const nextBtn = document.getElementById('nextBtn');
    if (currentQuestionIndex === quizQuestions.length - 1) {
        nextBtn.textContent = '提交测验';
        nextBtn.onclick = submitQuiz;
    } else {
        nextBtn.textContent = '下一题';
        nextBtn.onclick = nextQuestion;
    }
}

function selectOption(index) {
    userAnswers[currentQuestionIndex] = index;
    
    // 更新选项样式
    document.querySelectorAll('.option').forEach((opt, i) => {
        if (i === index) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

function submitQuiz() {
    // 检查是否有未答题
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0) {
        if (!confirm(`还有${unanswered}道题未作答,确定要提交吗?`)) {
            return;
        }
    }
    
    showResult();
}

// ========== 结果界面功能 ==========
function renderResult() {
    // 计算成绩
    let correctCount = 0;
    quizQuestions.forEach((q, i) => {
        if (userAnswers[i] === q.answer) {
            correctCount++;
        }
    });
    
    const wrongCount = quizQuestions.length - correctCount;
    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const accuracy = ((correctCount / quizQuestions.length) * 100).toFixed(1);
    const timeSpent = Math.round((Date.now() - quizStartTime) / 60000);
    
    // 显示成绩
    document.getElementById('finalScore').textContent = score;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('wrongCount').textContent = wrongCount;
    document.getElementById('accuracyRate').textContent = accuracy + '%';
    document.getElementById('timeSpent').textContent = timeSpent + '分钟';
    
    // 渲染错题回顾
    const reviewSection = document.getElementById('reviewSection');
    reviewSection.innerHTML = '<h3 style="margin-bottom: 20px;">📝 错题回顾与解析</h3>';
    
    quizQuestions.forEach((q, i) => {
        const isCorrect = userAnswers[i] === q.answer;
        const userAnswerLetter = userAnswers[i] !== null ? 
            String.fromCharCode(65 + userAnswers[i]) : '未作答';
        const correctLetter = String.fromCharCode(65 + q.answer);
        
        if (!isCorrect) {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.innerHTML = `
                <h4>第 ${i + 1} 题</h4>
                <p><strong>题目:</strong> ${q.question}</p>
                <p style="color: #dc3545;"><strong>你的答案:</strong> ${userAnswerLetter}</p>
                <p style="color: #28a745;"><strong>正确答案:</strong> ${correctLetter}. ${q.options[q.answer]}</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <strong>💡 解析:</strong><br>
                    ${q.explanation}
                </div>
            `;
            reviewSection.appendChild(reviewItem);
        }
    });
    
    if (correctCount === quizQuestions.length) {
        reviewSection.innerHTML += '<p style="text-align: center; color: #28a745; font-size: 1.2em; margin-top: 20px;">🎉 全部答对,太棒了!</p>';
    }
    
    // 评价
    let comment = '';
    if (score >= 90) {
        comment = '🏆 优秀! 你对AI Infra有深入的理解,可以和专家级候选人深度交流了!';
    } else if (score >= 80) {
        comment = '👍 良好! 继续加油,再深入学习一些细节知识会更好!';
    } else if (score >= 60) {
        comment = '💪 及格! 基础知识掌握了,建议重点学习错题涉及的知识点!';
    } else {
        comment = '📚 需要加强! 建议先系统学习知识库,再来测验!';
    }
    
    reviewSection.innerHTML = `<p style="text-align: center; font-size: 1.3em; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px;">${comment}</p>` + reviewSection.innerHTML;
}

// ========== 初始化 ==========
window.onload = function() {
    showHome();
};
