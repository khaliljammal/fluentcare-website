// Add verified public App Store / Google Play URLs when downloads launch.
const DOWNLOAD_LINKS = Object.freeze({ ios: '', android: '' });
const dialog = document.querySelector('#download-dialog');
document.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds=dialog.getBoundingClientRect(); if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) dialog.close(); } });
const availableLinks=Object.entries(DOWNLOAD_LINKS).filter(([,url])=>url);
if(availableLinks.length){document.querySelector('#download-title').textContent='Download FluentCare';dialog.querySelector('h2 + p').textContent='Choose your phone to get FluentCare.';availableLinks.forEach(([platform,url])=>{const link=document.createElement('a');link.className='button dark';link.href=url;link.textContent=platform==='ios'?'Download on the App Store':'Get it on Google Play';document.querySelector('#store-options').append(link);});}
else{const options=document.querySelector('#store-options');options.className='store-coming';for(const label of ['App Store','Google Play']){const option=document.createElement('span');option.append(label);const note=document.createElement('small');note.textContent='Coming soon';option.append(note);options.append(option);}}
const EXAMPLES = {
  welcome: { english: 'Hello. Do you have an appointment today?', spanish: 'Hola. ¿Tiene una cita hoy?', reply: 'Sí, a las diez de la mañana.', translation: 'Yes, at ten this morning.' },
  appointment: { english: 'Would Tuesday morning work for your next visit?', spanish: '¿Le vendría bien el martes por la mañana para su próxima visita?', reply: 'Sí, el martes por la mañana está bien.', translation: 'Yes, Tuesday morning works.' },
  comfort: { english: 'Would you like a glass of water?', spanish: '¿Le gustaría un vaso de agua?', reply: 'Sí, por favor. Muchas gracias.', translation: 'Yes, please. Thank you very much.' }
};
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
  stopPreview();
  const example=EXAMPLES[button.dataset.example];
  document.querySelector('#english-line').textContent=example.english;
  document.querySelector('#spanish-line').textContent=example.spanish;
  document.querySelector('#reply-line').textContent=example.reply;
  document.querySelector('#reply-translation').textContent=example.translation;
  document.querySelectorAll('[data-example]').forEach(choice=>{const active=choice===button;choice.classList.toggle('active',active);choice.setAttribute('aria-pressed',String(active));});
  const exchange=document.querySelector('.exchange');exchange.classList.remove('changed');requestAnimationFrame(()=>exchange.classList.add('changed'));
}));

const previewButton=document.querySelector('#play-preview');
const previewCard=document.querySelector('.conversation-card');
let previewTimers=[];
function stopPreview(){
  previewTimers.forEach(clearTimeout);previewTimers=[];
  previewCard.classList.remove('is-playing');delete previewCard.dataset.phase;
  previewButton.setAttribute('aria-pressed','false');
  previewButton.querySelector('span:last-child').textContent='Play visual preview';
  previewButton.querySelector('.play-icon').textContent='▷';
}
previewButton.addEventListener('click',()=>{
  if(previewButton.getAttribute('aria-pressed')==='true'){stopPreview();return;}
  previewButton.setAttribute('aria-pressed','true');
  previewButton.querySelector('span:last-child').textContent='Stop preview';
  previewButton.querySelector('.play-icon').textContent='□';
  previewCard.classList.add('is-playing');previewCard.dataset.phase='1';
  previewTimers.push(setTimeout(()=>previewCard.dataset.phase='2',1400));
  previewTimers.push(setTimeout(()=>previewCard.dataset.phase='3',3000));
  previewTimers.push(setTimeout(stopPreview,4700));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPreview();});

const WALKTHROUGH = {
  1: '<p class="eyebrow">A little preparation</p><h3>Let’s begin.</h3><p class="phone-hint">Choose the patient’s language.</p><div class="phone-language"><span>Patient language</span><strong>Spanish <span lang="es">/ Español</span></strong></div><div class="phone-agreement"><span aria-hidden="true">✓</span> AI translation explained.<br>Patient agreement confirmed.</div><div class="phone-button">Ready to start</div>',
  2: '<p class="eyebrow">Taking turns</p><h3>Speak naturally.</h3><p class="phone-hint">Place the phone between you.</p><div class="phone-session-pair">English <span aria-hidden="true">↔</span> Español</div><div class="large-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="phone-session-caption"><small>Caption preview</small>Hello, it’s good to see you.</div><div class="phone-controls"><span>Pause</span><span>End</span></div>',
  3: '<p class="eyebrow">You’re in control</p><h3>Take a pause.</h3><p class="phone-hint">Audio capture stops when paused.</p><div class="phone-paused-symbol" aria-hidden="true">Ⅱ</div><div class="phone-cleared"><span>Session paused</span>On-screen captions cleared.</div><div class="phone-button">Resume conversation</div>'
};
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-step]').forEach(step=>{const active=step===button;step.classList.toggle('active',active);step.setAttribute('aria-pressed',String(active));});
  document.querySelector('#phone-screen').innerHTML=WALKTHROUGH[button.dataset.step];
}));

if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});},{threshold:0.08});
  document.querySelectorAll('.section-heading,.benefit-card,.walkthrough-copy,.privacy-layout,.download-section').forEach(element=>{element.classList.add('reveal');observer.observe(element);});
}
