(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const posts = [...(window.POSTS_DATA || [])].sort((a,b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`));
  const escape = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = s => new Date(`${s}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const imagePath = name => `images/${encodeURIComponent(name)}`;
  const years = [...new Set(posts.map(p => p.date.slice(0,4)))].sort().reverse();
  let year = 'all', query = '', matches = [], shown = 0, viewerImages = [], viewerIndex = 0;
  let resizeObservers = [];
  $('#post-count').textContent = posts.length.toLocaleString();
  $('#photo-count').textContent = posts.reduce((n,p) => n + p.images.length,0).toLocaleString();
  $('#year-span').textContent = years.length ? `${years.at(-1)}–${years[0]}` : '—';
  $('#year-filters').innerHTML = ['all',...years].map(y => `<button type="button" data-year="${y}" aria-pressed="${y === 'all'}">${y === 'all' ? 'All years' : y}</button>`).join('');
  function card(p) {
    const imgs = p.images || [];
    const caption = escape(p.caption).replace(/\s*\|\s*/g,'\n\n');
    const long = (p.caption || '').length > 340;
    return `<article class="post" id="post-${p.post_number}"><div class="carousel" role="region" aria-roledescription="carousel" aria-label="Photographs from ${date(p.date)}"><div class="carousel-track" tabindex="0" aria-label="Swipe or use arrow keys to browse photographs">${imgs.map((img,i) => `<button class="slide" data-photo="${i}" data-post="${p.post_number}" aria-label="Open photograph ${i+1} of ${imgs.length}"><img src="${imagePath(img)}" alt="Activity on ${date(p.date)}, photograph ${i+1}" loading="lazy" decoding="async" width="800" height="600"></button>`).join('')}</div><div class="carousel-controls"><span class="slide-count" aria-live="polite">${imgs.length ? 1 : 0} / ${imgs.length}</span><span class="open-hint">SELECT PHOTO TO ENLARGE ↗</span><div><button data-step="-1" aria-label="Previous photograph" disabled>‹</button><button data-step="1" aria-label="Next photograph" ${imgs.length < 2 ? 'disabled' : ''}>›</button></div></div></div><div class="post-copy"><div class="post-meta"><span>ACTIVITY ${String(p.post_number).padStart(3,'0')}</span><span>${imgs.length} PHOTOS</span></div><h3>${date(p.date)}</h3>${long ? `<details><summary>Read full activity</summary><p class="caption">${caption}</p></details><p class="caption caption-preview">${caption}</p>` : `<p class="caption">${caption || 'A moment from the activity archive.'}</p>`}${p.source_url ? `<a class="text-link post-source" href="${escape(p.source_url)}" target="_blank" rel="noopener noreferrer">View original post ↗</a>` : ''}</div></article>`;
  }
  function append() {
    const batch = matches.slice(shown,shown+12);
    $('#posts').insertAdjacentHTML('beforeend',batch.map(card).join(''));
    shown += batch.length;
    $('#results').textContent = `${shown} of ${matches.length} activities${year === 'all' ? '' : ` in ${year}`}${query ? ' matching your search' : ''}`;
    $('#load-more').hidden = shown >= matches.length;
    document.querySelectorAll('.carousel-track:not([data-ready])').forEach(track => {
      track.dataset.ready = 'true';
      const controls = track.nextElementSibling;
      const update = () => {
        const i = Math.round(track.scrollLeft / Math.max(1,track.clientWidth));
        controls.querySelector('.slide-count').textContent = `${track.children.length ? i+1 : 0} / ${track.children.length}`;
        controls.querySelector('[data-step="-1"]').disabled = i <= 0;
        controls.querySelector('[data-step="1"]').disabled = i >= track.children.length-1;
      };
      track.addEventListener('scroll',update,{passive:true});
      controls.addEventListener('click',e => {const b=e.target.closest('[data-step]'); if(b) track.scrollBy({left:Number(b.dataset.step)*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant':'smooth'});});
      track.addEventListener('keydown',e => {if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();track.scrollBy({left:(e.key==='ArrowRight'?1:-1)*track.clientWidth});}});
      const observer = new ResizeObserver(update);observer.observe(track);resizeObservers.push(observer);
    });
  }
  function filter() {
    resizeObservers.forEach(o=>o.disconnect());resizeObservers=[];
    matches=posts.filter(p => (year==='all'||p.date.startsWith(year)) && `${p.caption} ${p.date}`.toLowerCase().includes(query));
    shown=0; $('#posts').replaceChildren(); append();
    if(!matches.length) $('#posts').innerHTML='<div class="empty"><h3>No activities found</h3><p>Try another year or a different search term.</p><button class="button" id="reset-search">Clear filters</button></div>';
  }
  $('#year-filters').addEventListener('click',e=>{const b=e.target.closest('[data-year]');if(!b)return;year=b.dataset.year;document.querySelectorAll('[data-year]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));filter();});
  let searchTimer;
  $('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();clearTimeout(searchTimer);searchTimer=setTimeout(filter,180);});
  $('#load-more').addEventListener('click',()=>{const previous=shown;append();const first=$('#posts').children[previous];if(first){first.tabIndex=-1;first.focus({preventScroll:true});}});
  const viewer=$('#viewer');
  function updateViewer(){ $('#viewer-image').src=imagePath(viewerImages[viewerIndex]);$('#viewer-image').alt=`Photograph ${viewerIndex+1} of ${viewerImages.length}`;$('#viewer-count').textContent=`${viewerIndex+1} / ${viewerImages.length}`;$('#viewer-prev').disabled=viewerIndex===0;$('#viewer-next').disabled=viewerIndex===viewerImages.length-1; }
  $('#posts').addEventListener('click',e=>{if(e.target.closest('#reset-search')){year='all';query='';$('#search').value='';document.querySelectorAll('[data-year]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.year==='all')));filter();return;}const b=e.target.closest('[data-photo]');if(!b)return;viewerImages=posts.find(p=>String(p.post_number)===b.dataset.post).images;viewerIndex=Number(b.dataset.photo);$('#viewer-title').textContent=`Activity ${b.dataset.post} · Photographs`;updateViewer();viewer.showModal();document.body.classList.add('viewer-open');});
  $('#close-viewer').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',()=>document.body.classList.remove('viewer-open'));
  function move(n){viewerIndex=Math.max(0,Math.min(viewerImages.length-1,viewerIndex+n));updateViewer();}
  $('#viewer-prev').addEventListener('click',()=>move(-1));$('#viewer-next').addEventListener('click',()=>move(1));
  viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
  let touchX;
  $('#viewer-image').addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});
  $('#viewer-image').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)move(dx<0?1:-1);},{passive:true});
  filter();
})();
