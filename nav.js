// Aural Alchemy — shared nav behaviour
(function(){
  // Mobile toggle
  const toggle=document.querySelector('.nav-toggle');
  const links=document.querySelector('.nav-links');
  if(toggle&&links){
    toggle.addEventListener('click',(e)=>{
      e.stopPropagation();
      links.classList.toggle('open');
    });
    document.addEventListener('click',()=>{
      links.classList.remove('open');
    });
    // Close on link click
    links.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click',()=>links.classList.remove('open'));
    });
  }

  // Mark active nav link
  const path=window.location.pathname.replace(/\/$/,'');
  document.querySelectorAll('.nav-links a').forEach(a=>{
    const href=a.getAttribute('href').replace(/\/$/,'');
    if(href===path||(path==='/aural-alchemy'&&href==='/')){
      a.classList.add('active');
    }
  });
})();
