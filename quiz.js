function calculateQuiz(){

let scores={
eco:0,
performance:0,
safety:0,
comfort:0,
technology:0,
family:0,
suv:0,
city:0
};

const radios=document.querySelectorAll("input[type=radio]:checked");

if(radios.length<10){
alert("กรุณาตอบคำถามให้ครบ");
return;
}

radios.forEach(r=>{
scores[r.value]++;
});

let sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);

let top3=sorted.slice(0,3);

const featureText={
eco:"รถ Hybrid หรือ EV ประหยัดพลังงาน",
performance:"รถสมรรถนะสูง ขับสนุก",
safety:"รถที่มีระบบความปลอดภัยสูง",
comfort:"รถที่ขับนุ่ม นั่งสบาย",
technology:"รถที่มีเทคโนโลยีทันสมัย",
family:"รถครอบครัวขนาดใหญ่",
suv:"รถ SUV ลุยได้ทุกสภาพถนน",
city:"รถขนาดเล็กเหมาะกับการขับในเมือง"
};

let result="<h2>รถที่เหมาะกับคุณ</h2><ul>";

top3.forEach(f=>{
result+="<li>"+featureText[f[0]]+"</li>";
});

result+="</ul>";

document.getElementById("quizResult").innerHTML=result;

document.getElementById("quizPage").classList.add("hidden");
document.getElementById("resultPage").classList.remove("hidden");

}

function goBack(){

document.getElementById("resultPage").classList.add("hidden");
document.getElementById("quizPage").classList.remove("hidden");

}

function goMain(){

document.getElementById("quizPage").classList.add("hidden");
document.getElementById("mainPage").classList.remove("hidden");

}