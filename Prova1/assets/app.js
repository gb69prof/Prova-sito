document.querySelectorAll('.cardLink').forEach(link=>{
  link.addEventListener('touchstart', ()=>{ link.classList.add('is-touch'); }, {passive:true});
  link.addEventListener('touchend', ()=>{ link.classList.remove('is-touch'); }, {passive:true});
});