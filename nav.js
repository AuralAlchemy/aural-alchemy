// Aural Alchemy — shared nav behaviour
(function(){
  // Mobile toggle
  const toggle=document.querySelector('.nav-toggle');
  const links=document.querySelector('.nav-links');
  if(toggle&&links){
    toggle.addEventListener('click',()=>{
      links.classList.toggle('open');
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
    if(href===path||(path==='/aural-alchemy'&&href==='/aural-alchemy/')){
      a.classList.add('active');
    }
  });
})();
