import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCd__eI5v4lxnVZ3y21zBhnR4z3v7jYb1M",
    authDomain: "gang-tour.firebaseapp.com",
    projectId: "gang-tour",
    storageBucket: "gang-tour.firebasestorage.app",
    messagingSenderId: "922550015080",
    appId: "1:922550015080:web:9d64dc829d58fbc28157dd",
    measurementId: "G-YQ907EXLSN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let globalMembers = [];
let globalExpenses = [];

const memberNameInput = document.getElementById('member-name');
const btnAddMember = document.getElementById('btn-add-member');
const memberBadges = document.getElementById('member-badges');
const expensePayerSelect = document.getElementById('expense-payer');
const expenseSharersDiv = document.getElementById('expense-sharers');
const splitTypeSelect = document.getElementById('split-type');

const expenseTitleInput = document.getElementById('expense-title');
const expenseAmountInput = document.getElementById('expense-amount');
const amountLabel = document.getElementById('amount-label');
const btnSaveExpense = document.getElementById('btn-save-expense');

const expenseListUl = document.getElementById('expense-list');
const settlementListDiv = document.getElementById('settlement-list');
const netSummaryCardsDiv = document.getElementById('net-summary-cards');
const btnMasterReset = document.getElementById('btn-master-reset');
const btnMasterResetMobile = document.getElementById('btn-master-reset-mobile');

function getAvatarUrl(name) {
    return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

onSnapshot(collection(db, "members"), (snapshot) => {
    globalMembers = [];
    snapshot.forEach(doc => globalMembers.push(doc.data().name));
    renderMemberUI();
    calculateMasterBalances(); 
});

const qExp = query(collection(db, "expenses"), orderBy("timestamp", "desc"));
onSnapshot(qExp, (snapshot) => {
    globalExpenses = [];
    snapshot.forEach(docSnap => {
        globalExpenses.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderExpenseUI();
    calculateMasterBalances(); 
});

splitTypeSelect.addEventListener('change', () => {
    renderMemberUI();
    const mode = splitTypeSelect.value;
    if (mode === 'custom') {
        expenseAmountInput.value = '0';
        expenseAmountInput.disabled = true;
        expenseAmountInput.classList.add('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
        amountLabel.innerHTML = '💰 จำนวนเงินรวม (คำนวณออโต้)';
    } else {
        expenseAmountInput.value = '';
        expenseAmountInput.disabled = false;
        expenseAmountInput.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
        amountLabel.innerHTML = '💰 จำนวนเงินรวม (บาท)';
    }
});

function updateLiveTotalAmount() {
    if (splitTypeSelect.value !== 'custom') return;
    const amountInputs = document.querySelectorAll('input[name="custom-amount"]');
    let sum = 0;
    amountInputs.forEach(input => {
        sum += Number(input.value) || 0;
    });
    expenseAmountInput.value = sum;
}

function renderMemberUI() {
    memberBadges.innerHTML = '';
    expensePayerSelect.innerHTML = '<option value="">-- เลือกคนจ่าย --</option>';
    expenseSharersDiv.innerHTML = '';

    if (globalMembers.length === 0) {
        memberBadges.innerHTML = '<span class="text-slate-400 text-xs italic">ไม่มีรายชื่อ...</span>';
        expenseSharersDiv.innerHTML = '<p class="text-slate-400 text-xs italic col-span-2">กรุณาเพิ่มเพื่อนก่อนนะริน</p>';
        return;
    }

    const currentMode = splitTypeSelect.value;

    globalMembers.forEach(name => {
        memberBadges.innerHTML += `
            <div class="flex items-center gap-2 bg-[#AEC3B0]/20 p-1.5 rounded-lg border border-[#AEC3B0]/30">
                <img src="${getAvatarUrl(name)}" class="w-5 h-5 rounded-full bg-white border border-slate-100" />
                <span class="text-xs font-normal text-[#0F2A1D]">${name}</span>
            </div>
        `;
        expensePayerSelect.innerHTML += `<option value="${name}">${name}</option>`;
        
        if (currentMode === 'equal') {
            expenseSharersDiv.innerHTML += `
                <label class="flex items-center gap-1.5 bg-white p-1.5 border border-[#AEC3B0]/30 rounded-md cursor-pointer select-none">
                    <input type="checkbox" name="sharers" value="${name}" checked class="rounded text-[#375534] w-3.5 h-3.5">
                    <span class="text-xs">${name}</span>
                </label>
            `;
        } else {
            expenseSharersDiv.innerHTML += `
                <div class="flex items-center justify-between gap-2 bg-white p-1.5 border border-[#AEC3B0]/30 rounded-md">
                    <span class="text-xs font-medium text-[#0F2A1D] min-w-16">${name} :</span>
                    <input type="number" name="custom-amount" data-name="${name}" placeholder="0" class="w-20 p-1 border border-[#AEC3B0]/60 rounded text-right text-xs bg-[#E3EED4]/5">
                </div>
            `;
        }
    });

    if (currentMode === 'custom') {
        const amountInputs = document.querySelectorAll('input[name="custom-amount"]');
        amountInputs.forEach(input => {
            input.addEventListener('input', updateLiveTotalAmount);
        });
    }
}

function renderExpenseUI() {
    expenseListUl.innerHTML = '';
    if (globalExpenses.length === 0) {
        expenseListUl.innerHTML = '<li class="text-slate-400 text-xs italic text-center py-4">ยังไม่มีประวัติการชำระเงิน</li>';
        return;
    }

    globalExpenses.forEach(exp => {
        const li = document.createElement('li');
        const modeText = exp.splitType === 'custom' ? ' (จ่ายตามจริง)' : ' (หารเท่ากัน)';
        
        li.className = "p-2.5 bg-slate-50/60 rounded-lg border border-[#AEC3B0]/20 flex justify-between items-center text-xs";
        li.innerHTML = `
            <div class="flex-1 flex items-center gap-2">
                <img src="${getAvatarUrl(exp.payer)}" class="w-4 h-4 rounded-full bg-white" />
                <div>
                    <span class="font-medium text-[#0F2A1D]">${exp.title}</span>
                    <span class="text-[11px] text-slate-400 ml-1">(คนจ่าย: <span class="text-[#375534]">${exp.payer}</span>${modeText})</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-medium text-[#0F2A1D]">${exp.amount.toLocaleString()} ฿</span>
                <button onclick="window.deleteBill('${exp.id}')" class="text-rose-600 hover:underline p-1 cursor-pointer text-[11px]">ลบ</button>
            </div>
        `;
        expenseListUl.appendChild(li);
    });
}

btnAddMember.addEventListener('click', async () => {
    const name = memberNameInput.value.trim();
    if(name) {
        if(globalMembers.includes(name)) { alert('ชื่อนี้ซ้ำแล้วจ้าริน!'); return; }
        await addDoc(collection(db, "members"), { name: name });
        memberNameInput.value = '';
    }
});

btnSaveExpense.addEventListener('click', async () => {
    const title = expenseTitleInput.value.trim();
    const totalAmount = Number(expenseAmountInput.value);
    const payer = expensePayerSelect.value;
    const splitType = splitTypeSelect.value;

    if(!title || totalAmount <= 0 || !payer) {
        alert('กรอกชื่อบิล และเลือกคนจ่ายเงินให้เรียบร้อยด้วยนะริน!');
        return;
    }

    let sharerData = {};

    if (splitType === 'equal') {
        const checkboxes = document.querySelectorAll('input[name="sharers"]:checked');
        const checkedNames = Array.from(checkboxes).map(cb => cb.value);
        if (checkedNames.length === 0) { alert('เลือกคนหารอย่างน้อย 1 คนนะริน!'); return; }
        
        const costPerPerson = totalAmount / checkedNames.length;
        checkedNames.forEach(name => {
            sharerData[name] = costPerPerson;
        });
    } else {
        const amountInputs = document.querySelectorAll('input[name="custom-amount"]');
        amountInputs.forEach(input => {
            const name = input.getAttribute('data-name');
            const amt = Number(input.value) || 0;
            if (amt > 0) {
                sharerData[name] = amt;
            }
        });

        if (Object.keys(sharerData).length === 0) { alert('กรุณากรอกยอดเงินค่ากินของเพื่อนๆ อย่างน้อย 1 คนจ้า!'); return; }
    }

    await addDoc(collection(db, "expenses"), {
        title: title,
        amount: totalAmount,
        payer: payer,
        splitType: splitType,
        sharersMap: sharerData,
        timestamp: new Date()
    });

    expenseTitleInput.value = '';
    expenseAmountInput.value = '';
    expensePayerSelect.value = '';
    splitTypeSelect.value = 'equal';
    expenseAmountInput.disabled = false;
    expenseAmountInput.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
    amountLabel.innerHTML = '💰 จำนวนเงินรวม (บาท)';
    renderMemberUI();
});

window.deleteBill = async (billId) => {
    if(confirm('ต้องการลบบิลนี้ใช่ไหมจ้าริน?')) {
        await deleteDoc(doc(db, "expenses", billId));
    }
};

const masterResetFunction = async () => {
    if (confirm('🚨 เริ่มทริปใหม่หมดใช่ไหมริน? ข้อมูลเดิมจะหายเกลี้ยงเลยนะ')) {
        const expSnap = await getDocs(collection(db, "expenses"));
        await Promise.all(expSnap.docs.map(d => deleteDoc(doc(db, "expenses", d.id))));
        const memSnap = await getDocs(collection(db, "members"));
        await Promise.all(memSnap.docs.map(d => deleteDoc(doc(db, "members", d.id))));
        alert('✨ เคลียร์คลาวด์เรียบร้อยแล้วริน!');
        window.location.reload();
    }
};

btnMasterReset.addEventListener('click', masterResetFunction);
btnMasterResetMobile.addEventListener('click', masterResetFunction);

function calculateMasterBalances() {
    settlementListDiv.innerHTML = '';
    netSummaryCardsDiv.innerHTML = '';

    if (globalMembers.length === 0 || globalExpenses.length === 0) {
        settlementListDiv.innerHTML = '<p class="opacity-60 italic text-xs py-2 text-center">ยังไม่มีรายการค้างจ่าย</p>';
        netSummaryCardsDiv.innerHTML = '<p class="col-span-full text-center text-slate-400 italic py-4">กรุณาเพิ่มเพื่อนและบันทึกบิลเพื่อดูสรุปยอดโอนจ้า</p>';
        return;
    }

    let pairDebts = {};
    globalMembers.forEach(m1 => {
        pairDebts[m1] = {};
        globalMembers.forEach(m2 => {
            pairDebts[m1][m2] = 0;
        });
    });

    globalExpenses.forEach(exp => {
        const title = exp.title;
        const payer = exp.payer;
        const amount = Number(exp.amount);
        let sharersMap = exp.sharersMap || {};
        
        if (!exp.sharersMap && exp.sharers) {
            const fallbackCost = amount / exp.sharers.length;
            exp.sharers.forEach(s => { sharersMap[s] = fallbackCost; });
        }

        const billBlock = document.createElement('div');
        billBlock.className = "bg-slate-50/60 p-2 rounded-lg border border-[#AEC3B0]/30 space-y-1";
        let htmlContent = `<p class="font-medium text-[#375534] text-xs">📌 ${title} (${amount.toLocaleString()} ฿)</p><ul class="space-y-1 text-[11px] text-slate-600">`;

        let hasDebtors = false;
        for (let sharer in sharersMap) {
            const costPerPerson = sharersMap[sharer];
            if (sharer !== payer && costPerPerson > 0) {
                hasDebtors = true;
                if(pairDebts[sharer] !== undefined && pairDebts[sharer][payer] !== undefined) {
                    pairDebts[sharer][payer] += costPerPerson;
                }
                htmlContent += `
                    <li class="flex justify-between items-center bg-white/50 p-1 rounded">
                        <span>💸 <span>${sharer}</span> ให้ <span class="font-medium">${payer}</span></span>
                        <span class="text-[#0F2A1D] font-medium">${Math.round(costPerPerson).toLocaleString()} ฿</span>
                    </li>`;
            }
        }

        if (!hasDebtors) htmlContent += `<li class="italic opacity-60">บิลนี้คนจ่ายออกคนเดียวจ้า</li>`;

        htmlContent += `</ul>`;
        billBlock.innerHTML = htmlContent;
        settlementListDiv.appendChild(billBlock);
    });

    let individualSettlements = {};
    globalMembers.forEach(name => { individualSettlements[name] = []; });

    let hasAnyTransactions = false;

    for (let i = 0; i < globalMembers.length; i++) {
        for (let j = i + 1; j < globalMembers.length; j++) {
            let p1 = globalMembers[i];
            let p2 = globalMembers[j];

            let p1_owes_p2 = pairDebts[p1][p2] || 0;
            let p2_owes_p1 = pairDebts[p2][p1] || 0;

            if (p1_owes_p2 > p2_owes_p1) {
                let finalNet = p1_owes_p2 - p2_owes_p1;
                if (finalNet > 0.5) {
                    individualSettlements[p1].push({ to: p2, amount: Math.round(finalNet) });
                    hasAnyTransactions = true;
                }
            } else if (p2_owes_p1 > p1_owes_p2) {
                let finalNet = p2_owes_p1 - p1_owes_p2;
                if (finalNet > 0.5) {
                    individualSettlements[p2].push({ to: p1, amount: Math.round(finalNet) });
                    hasAnyTransactions = true;
                }
            }
        }
    }

    /* 🎨 วาดการ์ดสรุปรายบุคคล (เวอร์ชันหักห้ามใจ ไม่เนียนขึ้นจุดพลุตอนเริ่มทริปแล้ว) */
    if (!hasAnyTransactions) {
        if (globalMembers.length === 0 || globalExpenses.length === 0) {
            netSummaryCardsDiv.innerHTML = '<p class="col-span-full text-center text-slate-400 italic py-4">กรุณาเพิ่มเพื่อนและบันทึกบิลเพื่อดูสรุปยอดโอนจ้า</p>';
        } else {
            netSummaryCardsDiv.innerHTML = '<p class="col-span-full text-center text-emerald-800 font-medium py-4">🎉 ยอดเงินลงตัวทุกคน เจ๊ากันหมดแล้ว!</p>';
        }
    } else {
        globalMembers.forEach(name => {
            const debts = individualSettlements[name];
            const card = document.createElement('div');
            
            if (debts.length === 0) {
                card.className = "p-3 bg-[#E3EED4]/30 rounded-lg border border-[#AEC3B0]/20 flex items-center gap-3 opacity-60";
                card.innerHTML = `
                    <img src="${getAvatarUrl(name)}" class="w-8 h-8 rounded-full bg-white border border-slate-100" />
                    <div>
                        <p class="font-medium text-[#375534]">👤 ${name}</p>
                        <p class="text-emerald-700 italic text-[11px]">✨ เคลียร์ครบ ไม่มีหนี้ค้างโอนจ้า</p>
                    </div>
                `;
            } else {
                card.className = "p-3 bg-white rounded-lg border border-[#AEC3B0]/40 shadow-2xs flex gap-3 items-start";
                let cardHtml = `
                    <img src="${getAvatarUrl(name)}" class="w-8 h-8 rounded-full bg-white border border-slate-200 mt-0.5" />
                    <div class="flex-1">
                        <p class="font-medium text-rose-700 mb-1.5">👤 ${name} <span class="text-[10px] text-slate-400 font-normal">(ต้องโอนออก)</span></p>
                        <ul class="space-y-1">`;
                
                debts.forEach(d => {
                    cardHtml += `
                        <li class="flex justify-between items-center bg-slate-50 p-1 rounded border border-slate-100">
                            <span class="flex items-center gap-1">
                                <img src="${getAvatarUrl(d.to)}" class="w-3.5 h-3.5 rounded-full bg-white" />
                                <span>โอนให้ <span class="font-medium text-[#0F2A1D]">${d.to}</span></span>
                            </span>
                            <span class="font-bold text-[#375534] bg-[#E3EED4]/50 px-1.5 py-0.5 rounded text-[11px]">${d.amount.toLocaleString()} ฿</span>
                        </li>`;
                });
                
                cardHtml += `</ul></div>`;
                card.innerHTML = cardHtml;
            }
            netSummaryCardsDiv.appendChild(card);
        });
    }
}
