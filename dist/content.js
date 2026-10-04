// Local illustrative calculator only. No account mutation or analytics capture.
const calculator=document.querySelector('[data-usage-example]');
if(calculator){
 const monthly=Number(calculator.dataset.monthly),included=Number(calculator.dataset.included),overage=Number(calculator.dataset.overage);
 const input=calculator.querySelector('input[type="range"]');
 if(input&&[monthly,included,overage].every(value=>Number.isFinite(value)&&value>=0)){
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
  function update(){
   const minutes=Number(input.value);if(!Number.isFinite(minutes))return;
   const extra=Math.max(0,minutes-included)*overage;
   calculator.querySelector('#minutes-label').textContent=`${minutes} minutes`;
   calculator.querySelector('#extra-estimate').textContent=money(extra);
   calculator.querySelector('#total-estimate').textContent=money(monthly+extra);
   const progress=(minutes-Number(input.min))/(Number(input.max)-Number(input.min));
   input.style.setProperty('--range-fill',`${progress*100}%`);
  }
  input.addEventListener('input',update);update();
 }
}
