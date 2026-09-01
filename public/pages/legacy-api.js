(() => {
  'use strict';
  const KEY = 'allrental_admin_store_v2';
  const nativeFetch = window.fetch.bind(window);
  const now = () => new Date().toISOString();
  const uid = (p='r') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const defaults = () => ({ submissions: [], settlements: [], estimates: [], applyLinks: [], cart: [], faq: [], comments: [], materials: {} });
  const read = () => {
    try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (_) { return defaults(); }
  };
  const write = db => { localStorage.setItem(KEY, JSON.stringify(db)); window.dispatchEvent(new CustomEvent('allrental:data')); return db; };
  const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const html = (body, status=200) => new Response(String(body ?? ''), { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bodyObject = async options => {
    const body = options?.body;
    if (!body) return {};
    if (body instanceof FormData) return Object.fromEntries(body.entries());
    if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
    if (typeof body === 'string') {
      try { return JSON.parse(body); } catch (_) { return Object.fromEntries(new URLSearchParams(body)); }
    }
    return {};
  };
  const productsOf = row => Array.isArray(row?.products) ? row.products : [];
  const savedList = db => db.submissions.map(row => ({
    id: row.id, created_at: row.created_at, brand: row.brand || '',
    customer_name: row.customer_name || '', contact: row.contact || '',
    product_name: productsOf(row).map(p => p.name).filter(Boolean).join(', '),
    raw_data: JSON.stringify(row)
  }));
  const facets = rows => ({
    months: [...new Set(rows.map(r => r.settlement_month).filter(Boolean))],
    partners: [...new Set(rows.map(r => r.partner_name).filter(Boolean))],
    managers: [...new Set(rows.map(r => r.manager_name).filter(Boolean))],
    brands: [...new Set(rows.map(r => r.brand).filter(Boolean))],
    finalized: ['0','1']
  });
  const filterSettlements = (rows, u) => rows.filter(r => {
    const many = (key, field) => {
      const q = u.searchParams.getAll(key);
      return !q.length || q.includes(String(r[field] ?? ''));
    };
    const cq = (u.searchParams.get('customer_q') || '').toLowerCase();
    return many('settlement_month[]','settlement_month') && many('partner_name[]','partner_name') &&
      many('manager_name[]','manager_name') && many('brand[]','brand') &&
      (!cq || (String(r.customer_name)+' '+String(r.customer_number)).toLowerCase().includes(cq));
  });
  const commentsHtml = (db, postId) => db.comments.filter(c => String(c.post_id) === String(postId)).map(c =>
    '<div class="border rounded p-2 mb-2"><div>'+esc(c.comment)+'</div><small class="text-muted">'+esc(new Date(c.created_at).toLocaleString('ko-KR'))+
    '</small><button type="button" class="btn btn-sm btn-link delete-btn" data-id="'+esc(c.id)+'">삭제</button><div id="reply-box-'+esc(c.id)+'" class="reply-container"></div></div>'
  ).join('') || '<div class="text-muted">등록된 댓글이 없습니다.</div>';
  const faqHtml = (db, u) => {
    const step = u.searchParams.get('ajax');
    const brand = u.searchParams.get('brand') || '';
    const inquiry = u.searchParams.get('inquiry') || '';
    const seedBrands = ['코웨이','청호나이스','쿠쿠','SK매직','현대큐밍','LG','웰스','세스코'];
    const brands = [...new Set([...seedBrands, ...db.faq.map(x => x.brand).filter(Boolean)])];
    if (step === 'brands') return brands.map((b,i) => '<div class="form-check"><input class="form-check-input brand-dd-item" type="checkbox" id="brand-dd-'+i+'" value="'+esc(b)+'"><label class="form-check-label" for="brand-dd-'+i+'">'+esc(b)+'</label></div>').join('');
    if (step === '1') return brands.map(b => '<button type="button" class="btn faq-choice-btn" data-choice-label="'+esc(b)+'" onclick="loadStep2(\''+esc(b)+'\')">'+esc(b)+'</button>').join('');
    if (step === '2') {
      const items = db.faq.filter(x => x.brand === brand);
      const qs = [...new Set(items.map(x => x.inquiry || '미작성(작성중)'))];
      return qs.map(q => '<button type="button" class="btn faq-choice-btn" data-choice-label="'+esc(q)+'" onclick="loadAnswerByInquiry(\''+esc(q)+'\')">'+esc(q)+'</button>').join('') || '<div class="text-muted">등록된 문의유형이 없습니다.</div>';
    }
    if (step === 'answer') {
      const items = db.faq.filter(x => x.brand === brand && (x.inquiry || '미작성(작성중)') === inquiry);
      return items.map(x => '<article class="answer-card" data-faq-id="'+esc(x.id)+'"><div class="faq-answer-text">'+esc(x.answer).replace(/\n/g,'<br>')+'</div></article>').join('') || '<div class="text-muted">등록된 답변이 없습니다.</div>';
    }
    if (step === 'search') {
      const q=(u.searchParams.get('keyword')||'').toLowerCase();
      return db.faq.filter(x => !q || (x.brand+' '+x.inquiry+' '+x.answer).toLowerCase().includes(q))
        .map(x => '<button type="button" class="btn faq-choice-btn" onclick="loadStep2(\''+esc(x.brand)+'\')">'+esc(x.brand)+' · '+esc(x.inquiry)+'</button>').join('');
    }
    if (step === 'file_list') return '<div class="text-muted">첨부파일이 없습니다.</div>';
    return '';
  };

  window.fetch = async function(input, options={}) {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    const u = new URL(rawUrl, location.href);
    const path = u.pathname.split('/').pop() || '';
    const method = String(options.method || (input?.method) || 'GET').toUpperCase();
    const data = await bodyObject(options);
    let db = read();

    if (path === 'save_json.php') {
      // 고객 접수 링크 제출 처리
      if ((data.action === 'customer_submit' || data._source === 'customer_apply') && data.token) {
        const link = db.applyLinks.find(x => x.token === data.token);
        if (!link) return json({ success: false, message: '유효하지 않은 링크입니다.' });
        if (link.status === '취소') return json({ success: false, message: '취소된 링크입니다.' });
        if (link.status === '사용완료') return json({ success: false, message: '이미 접수가 완료된 링크입니다.' });
        const customerPayload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        const row = Object.assign({}, customerPayload, { id: uid('sub'), created_at: now(), source: '고객접수', apply_token: data.token });
        db.submissions.unshift(row);
        productsOf(row).forEach((p, idx) => {
          const rentalFee = Number(String(p.rental_fee || p.렌탈료 || '').replace(/[^0-9.-]/g, '') || 0);
          const commissionRate = Number(p.commission_rate || p.commission || p.수수료 || 0);
          const commission = Math.round(rentalFee * commissionRate);
          db.settlements.unshift({
            id: uid('set'), created_at: now(), settlement_month: (row.created_at || '').slice(0, 7),
            partner_name: p.brand || p.브랜드 || row.brand || '', manager_name: row.manager || '',
            brand: p.brand || p.브랜드 || row.brand || '', customer_name: row.customer_name || '',
            customer_number: '', product_name: p.name || p.상품명 || '', model_name: p.model || p.모델명 || '',
            regulation: p.regulation || p.규정 || '', contract: p.contract || p.약정 || '',
            management: p.management || p.관리 || '', rental_fee: rentalFee, commission: commission,
            commission_rate: commissionRate, product_seq: idx, application_id: row.id,
            settlement_for: '관리자', is_finalized: false,
          });
        });
        link.status = '사용완료';
        link.events = link.events || [];
        link.events.push({ type: 'submit', at: now(), payload: customerPayload });
        write(db);
        return json({ success: true, inserted: { brand: row.brand, customer_name: row.customer_name, contact: row.contact, product_name: (productsOf(row)[0] || {}).name || '' } });
      }
      const row = Object.assign({}, data, { id: data.id || uid('sub'), created_at: now(), source: u.searchParams.get('_source') || '저장' });
      db.submissions.unshift(row);
      // ✅ 접수 저장 시 정산서에도 자동 동기화 (접수→정산 자동 반영)
      productsOf(row).forEach((p, idx) => {
        const rentalFee = Number(String(p.rental_fee || p.렌탈료 || '').replace(/[^0-9.-]/g, '') || 0);
        const commissionRate = Number(p.commission_rate || p.commission || p.수수료 || 0);
        const commission = Math.round(rentalFee * commissionRate);
        db.settlements.unshift({
          id: uid('set'),
          created_at: now(),
          settlement_month: (row.created_at || '').slice(0, 7),
          partner_name: p.brand || p.브랜드 || row.brand || '',
          manager_name: row.manager || '',
          brand: p.brand || p.브랜드 || row.brand || '',
          customer_name: row.customer_name || '',
          customer_number: '',
          product_name: p.name || p.상품명 || '',
          model_name: p.model || p.모델명 || '',
          regulation: p.regulation || p.규정 || '',
          contract: p.contract || p.약정 || '',
          management: p.management || p.관리 || '',
          rental_fee: rentalFee,
          commission: commission,
          commission_rate: commissionRate,
          product_seq: idx,
          application_id: row.id,
          settlement_for: '관리자',
          is_finalized: false,
        });
      });
      write(db);
      const first = productsOf(row)[0] || {};
      return json({ success: true, inserted: { brand: row.brand, customer_name: row.customer_name, contact: row.contact, product_name: first.name || '' } });
    }
    if (path === 'fetch_saved_list.php') return json(savedList(db));
    if (path === 'fetch_saved_single.php') {
      const row = db.submissions.find(x => String(x.id) === String(data.id));
      return json(row ? { success:true, raw_data:JSON.stringify(row) } : { success:false, error:'저장 항목을 찾을 수 없습니다.' });
    }
    if (path === 'fetch_delete.php' || path === 'delete_entry.php') {
      db.submissions = db.submissions.filter(x => String(x.id) !== String(data.id)); write(db);
      return json({ success:true });
    }

    if (path === 'estimate_cart.php') {
      const action = u.searchParams.get('action') || data.action || (method === 'GET' ? 'list' : 'add');
      if (action === 'list') return json({ success:true, items:db.cart, data:db.cart });
      if (action === 'clear_ajax' || action === 'clear') db.cart=[];
      else if (action === 'remove') db.cart=db.cart.filter(x=>String(x.id)!==String(data.id));
      else db.cart.push(Object.assign({id:uid('cart')},data));
      write(db); return json({success:true,items:db.cart,data:db.cart});
    }

    if (path === 'settlement_manage_data.php' || path === 'settlement_admin_data.php') {
      const mode = u.searchParams.get('mode') || data.mode || '';
      if (mode === 'invoice_list' || mode === 'marketer_list' || mode === 'list') {
        const rows = filterSettlements(db.settlements,u);
        return json({success:true,data:rows,rows,facets:facets(rows),months:facets(rows).months});
      }
      if (/lookup/.test(mode)) return json({success:true,data:[],rows:[]});
      if (/months/.test(mode)) return json({success:true,data:facets(db.settlements).months,months:facets(db.settlements).months});
      if (/sellers|users|profiles|business/.test(mode)) return json({success:true,data:[],rows:[],items:[]});
      if (/add_row/.test(mode)) {
        const row=Object.assign({id:uid('set'),settlement_month:'',partner_name:'',manager_name:'',brand:'',product_name:'',customer_name:'',customer_number:'',vat_base:0,is_finalized:false,settlement_for:'관리자'},data);
        db.settlements.unshift(row);write(db);return json({success:true,data:row,row});
      }
      if (/update/.test(mode)) {
        let updates=data.rows||data.items||[]; if(typeof updates==='string'){try{updates=JSON.parse(updates)}catch{updates=[]}}
        updates.forEach(p=>{const i=db.settlements.findIndex(x=>String(x.id)===String(p.id));if(i>=0)db.settlements[i]=Object.assign({},db.settlements[i],p)});
        write(db);return json({success:true,updated:updates.length});
      }
      if (/delete/.test(mode)) {
        let ids=data.ids||[];if(typeof ids==='string'){try{ids=JSON.parse(ids)}catch{ids=[ids]}}
        db.settlements=db.settlements.filter(x=>!ids.map(String).includes(String(x.id)));write(db);return json({success:true});
      }
      if (/toggle_final/.test(mode)) {
        let ids=data.ids||data.snapshot_ids||[];if(typeof ids==='string'){try{ids=JSON.parse(ids)}catch{ids=[ids]}}
        db.settlements=db.settlements.map(x=>ids.map(String).includes(String(x.id))?Object.assign({},x,{is_finalized:!x.is_finalized}):x);write(db);return json({success:true});
      }
      return json({success:true,data:[],rows:[],facets:facets(db.settlements)});
    }
    if (path === 'settlement_invoice_action.php') {
      let ids=data.snapshot_ids||[];if(typeof ids==='string'){try{ids=JSON.parse(ids)}catch{ids=[]}}
      return json({success:true,selected_rows:ids.length,inserted_rows:ids.length,error_rows:0,errors:[]});
    }

    if (path === 'save_estimate.php') {
      const row={id:uid('est'),created_at:now(),estimate_date:new Date().toISOString().slice(0,10),customer_name:String(data.customer_name||data.name||''),manager:String(data.manager||''),brand:String(data.brand||''),product_name:String(data.product_name||''),filename:'',payload:data};
      db.estimates.unshift(row);write(db);return json({success:true,id:row.id,message:'저장되었습니다.'});
    }
    if (path === 'fetch_estimate_list.php') {
      const page=Number(u.searchParams.get('page')||1), size=20, rows=db.estimates.slice((page-1)*size,page*size);
      return json({success:true,rows,page,pages:Math.max(1,Math.ceil(db.estimates.length/size)),total:db.estimates.length});
    }
    if (path === 'delete_estimate.php') {
      db.estimates=db.estimates.filter(x=>String(x.id)!==String(data.id));write(db);return json({success:true});
    }

    if (path === 'customer_apply_create.php') {
      const token=uid('apply').replace(/_/g,'');
      const row={id:uid('link'),token,status:'대기',created_at:now(),payload:data,events:[]};
      db.applyLinks.unshift(row);write(db);
      return json({success:true,token,link:location.origin+'/apply/'+token,requires_attachment:false});
    }
    if (path === 'customer_apply_cancel.php') {
      const row=db.applyLinks.find(x=>x.token===data.token);if(row)row.status='취소';write(db);return json({success:true});
    }
    if (path === 'customer_apply_detail.php') {
      const row=db.applyLinks.find(x=>x.token===u.searchParams.get('token'));
      return json(row?{success:true,token:row.token,status:row.status,payload:row.payload,submit_rows:[],files:[],events:row.events,main_prefill:row.payload}:{success:false,error:'링크 정보를 찾을 수 없습니다.'});
    }

    if (path === 'analysis_summary.php') return json({monthly:{},daily:{},brands:{},brand:{},summary:{total:0}});
    if (path === 'ucansign_consent_api.php') return json({success:false,message:'전자서명 서비스 연결 설정이 필요합니다.'});

    if (path === 'business_card.html' && method === 'POST') {
      const action=data.action||'';
      if(action==='text_read'){
        const content=db.materials[data.target]||'';
        return json({ok:true,content:btoa(unescape(encodeURIComponent(content)))});
      }
      if(action==='text_search'){
        const q=String(data.q||'').toLowerCase();
        return json({ok:true,hits:Object.keys(db.materials).filter(k=>(k+' '+db.materials[k]).toLowerCase().includes(q))});
      }
      if(action==='text_new'||action==='text_edit'){
        const pathKey=data.target||[data.parent,data.name?data.name+'.txt':''].filter(Boolean).join('/');
        db.materials[pathKey]=String(data.content||'');write(db);return json({ok:true});
      }
      if(action==='text_delete'){delete db.materials[data.target];write(db);return json({ok:true});}
      return json({ok:true});
    }

    if (path === 'faq.html' && u.searchParams.has('ajax')) {
      if(method==='GET') return html(faqHtml(db,u));
      const action=u.searchParams.get('ajax');
      if(action==='add_brand') db.faq.push({id:uid('faq'),brand:String(data.brand||''),inquiry:'미작성(작성중)',answer:'',tags:''});
      if(action==='add_draft') db.faq.push({id:uid('faq'),brand:String(data.brand||''),inquiry:'미작성(작성중)',answer:'',tags:''});
      if(action==='save_faq'){const x=db.faq.find(v=>String(v.id)===String(data.id));if(x)Object.assign(x,{inquiry:data.inquiry,answer:data.answer,tags:data.tags});}
      if(action==='delete_faq') db.faq=db.faq.filter(v=>String(v.id)!==String(data.id));
      if(action==='delete_brand') db.faq=db.faq.filter(v=>v.brand!==data.brand);
      if(action==='delete_inquiry') db.faq=db.faq.filter(v=>!(v.brand===data.brand&&v.inquiry===data.inquiry));
      write(db);return html('ok');
    }
    if (path === 'faq.html' && method==='GET' && u.searchParams.has('ajax')) return html(faqHtml(db,u));

    if (path === 'suggestion_board_view.php') {
      const postId=u.searchParams.get('id')||'1';
      return html('<div class="modal-header"><h5 class="modal-title">공지·문의 상세</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><div id="comment-list">'+commentsHtml(db,postId)+'</div><input type="hidden" name="parent_id" value=""><textarea name="comment" class="form-control mt-3"></textarea><button id="submit-comment" type="button" class="btn btn-primary mt-2">댓글작성</button></div>');
    }
    if (path === 'suggestion_comment_ajax.php') {
      const postId=data.post_id||'1';
      if(data.comment) db.comments.push({id:uid('com'),post_id:postId,parent_id:data.parent_id||'',comment:data.comment,created_at:now()});
      write(db);return html(commentsHtml(db,postId));
    }
    if (path === 'suggestion_comment_delete.php') {
      db.comments=db.comments.filter(x=>String(x.id)!==String(data.id));write(db);return html('ok');
    }

    return nativeFetch(input, options);
  };

  document.addEventListener('submit', event => {
    const form=event.target;
    if(!(form instanceof HTMLFormElement)) return;
    const action=new URL(form.action||location.href,location.href);
    if(!/\.php$/i.test(action.pathname)) return;
    event.preventDefault();
    const payload=Object.fromEntries(new FormData(form).entries());
    const db=read();
    const key=(payload.action||'form')+'_'+uid();
    db.materials[key]=JSON.stringify(payload);write(db);
    alert('저장되었습니다.');
  }, true);

  window.AllRentalStore = { read, write, clear: () => localStorage.removeItem(KEY) };
  document.addEventListener('DOMContentLoaded', () => {
    const page=location.pathname.split('/').pop();
    const db=read();
    if(page==='submission_list.html' && db.submissions.length){
      const tbody=document.querySelector('table tbody');
      if(tbody){
        const existing=new Set([...tbody.querySelectorAll('tr[data-id]')].map(tr=>tr.dataset.id));
        db.submissions.filter(x=>!existing.has(String(x.id))).forEach(row=>{
          const product=productsOf(row)[0]||{};
          const tr=document.createElement('tr');
          tr.dataset.id=row.id;tr.dataset.created=row.created_at;tr.dataset.json=JSON.stringify(row);
          tr.innerHTML='<td>'+esc((row.created_at||'').slice(0,16).replace('T',' '))+'</td><td>'+esc(row.manager||'')+'</td><td>'+esc(row.customer_name||'')+'</td><td>'+esc(row.contact||'')+'</td><td>'+esc(row.brand||'')+'</td><td>'+esc(product.name||'')+'</td><td>'+esc(product.regulation||'')+'</td><td>'+esc(product.contract||'')+'</td><td>'+esc(product.management||'')+'</td><td>'+esc(product.rental_fee||'')+'</td><td>'+esc(row.special_note||'')+'</td><td>'+productsOf(row).length+'</td><td><button type="button" class="btn btn-sm btn-primary btn-detail">자세히</button> <button type="button" class="btn btn-sm btn-danger" onclick="const d=AllRentalStore.read();d.submissions=d.submissions.filter(x=>x.id!==\''+esc(row.id)+'\');AllRentalStore.write(d);this.closest(\'tr\').remove()">삭제</button></td>';
          tbody.prepend(tr);
        });
      }
    }
    if(page==='customer_apply_manage.html' && db.applyLinks.length){
      const tbody=document.querySelector('.ca-table tbody');
      if(tbody){
        tbody.innerHTML='';
        db.applyLinks.forEach(row=>{
          const p=row.payload||{}, product=p.product||p.product_name||{};
          const tr=document.createElement('tr');
          tr.innerHTML='<td>'+esc(row.status||'생성됨')+'</td><td>'+esc((row.created_at||'').slice(0,10))+'</td><td>'+esc(p.customer_name||'')+'</td><td>'+esc(p.customer_phone||'')+'</td><td>'+esc(p.brand||'')+'</td><td>'+esc(p.product_name||product.name||'')+'</td><td>'+esc(p.regulation||'')+'</td><td>'+esc((row.created_at||'').slice(0,16).replace('T',' '))+'</td><td><button type="button" class="ca-action-btn" onclick="caCopyText(\''+esc(location.origin+'/apply/'+row.token)+'\')">링크복사</button> <button type="button" class="ca-action-btn" onclick="caOpenDetail(\''+esc(row.token)+'\')">상세</button> <button type="button" class="ca-action-btn danger" onclick="caCancelLink(\''+esc(row.token)+'\')">취소</button></td>';
          tbody.appendChild(tr);
        });
      }
    }
  });

})();