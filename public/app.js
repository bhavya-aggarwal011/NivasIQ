const API = 'http://localhost:5000';
let allRooms=[], allStudents=[], allLeaves=[], allGuests=[];
let currentStudentHostel='all', currentFeeHostel='all', currentFeeStatus='all';
let currentLeaveHostel='all', currentLeaveStatus='all';
let currentGuestHostel='all', currentGuestStatus='all';
let currentDashHostel=null, feeEditRoll=null, leaveActionId=null;

// ── UTILITIES ──
function showToast(msg,type){
    type=type||'success';
    const t=document.getElementById('toast');
    t.textContent=msg;
    t.className='toast '+type+' show';
    setTimeout(function(){t.classList.remove('show');},3500);
}

function closeModal(id){document.getElementById(id).classList.remove('open');}
function openModal(id){document.getElementById(id).classList.add('open');}

function fmtDate(dt){
    if(!dt)return'—';
    return new Date(dt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

function fmtDateOnly(d){
    if(!d)return'—';
    return new Date(d).toLocaleDateString('en-IN');
}

function escHtml(s){
    if(!s)return'';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── PAGE NAVIGATION ──
function showPage(page){
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
    document.getElementById('page-'+page).classList.add('active');
    document.getElementById('nav-'+page).classList.add('active');
}

// ── DASHBOARD / LANDING ──
function showLanding(){
    currentDashHostel=null;
    document.getElementById('niq-landing').style.display='flex';
    document.getElementById('room-grid-view').classList.remove('visible');
    document.getElementById('dash-topbar-title').textContent='Dashboard';
    document.getElementById('dash-legend').style.display='none';
    document.getElementById('dash-back-btn').style.display='none';
    document.querySelectorAll('#dash-tabs .tab').forEach(function(t){t.classList.remove('active');});
}

function updateLandingStats(){
    const ts=allRooms.reduce(function(a,r){return a+r.total_seats;},0);
    const os=allRooms.reduce(function(a,r){return a+r.occupied_seats;},0);
    ['niq-total-seats','total-seats'].forEach(function(id){document.getElementById(id).textContent=ts||'–';});
    ['niq-available','seat-count'].forEach(function(id){document.getElementById(id).textContent=ts?(ts-os):'–';});
    ['niq-occupied','occupied-count'].forEach(function(id){document.getElementById(id).textContent=os||'–';});
    ['Ivory','Einstein','Rosewood','Chanakya'].forEach(function(h){
        const rooms=allRooms.filter(function(r){return r.hostel_name===h;});
        const avail=rooms.filter(function(r){return r.occupied_seats<r.total_seats;}).length;
        const el=document.getElementById('niq-'+h.toLowerCase()+'-rooms');
        if(el)el.textContent=rooms.length+' rooms · '+avail+' available';
    });
}

function selectHostelByName(name){
    document.querySelectorAll('#dash-tabs .tab').forEach(function(btn){
        if(btn.textContent.trim().includes(name))selectHostel(name,btn);
    });
}

function selectHostel(name,btn){
    currentDashHostel=name;
    document.querySelectorAll('#dash-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    document.getElementById('niq-landing').style.display='none';
    document.getElementById('room-grid-view').classList.add('visible');
    const icons={Ivory:'🌸',Einstein:'🔬',Rosewood:'🌹',Chanakya:'⚡'};
    document.getElementById('dash-topbar-title').textContent=(icons[name]||'')+' '+name+' Hostel';
    document.getElementById('dash-legend').style.display='flex';
    document.getElementById('dash-back-btn').style.display='inline-flex';
    renderRoomGrid(name);
}

// ── ROOM GRID ──
function renderRoomGrid(hName){
    const grid=document.getElementById('room-grid');
    grid.innerHTML='';
    const meta={
        Ivory:    {color:'#ec4899',gender:'Girls',ac:'AC'},
        Einstein: {color:'#2563eb',gender:'Boys', ac:'Non-AC'},
        Rosewood: {color:'#ef4444',gender:'Girls',ac:'Non-AC'},
        Chanakya: {color:'#7c3aed',gender:'Boys', ac:'AC'}
    };
    const hostelRooms=allRooms.filter(function(r){return r.hostel_name===hName;});
    if(!hostelRooms.length){
        grid.innerHTML='<div class="empty"><div class="empty-icon">🚫</div>No rooms found for '+hName+'</div>';
        return;
    }
    const byFloor={};
    hostelRooms.forEach(function(room){
        const f=String(room.room_number).match(/\d+/);
        const floor=f?f[0][0]:'0';
        if(!byFloor[floor])byFloor[floor]=[];
        byFloor[floor].push(room);
    });
    const m=meta[hName]||{color:'var(--accent)',gender:'',ac:''};
    const hdr=document.createElement('div');
    hdr.className='section-header';
    hdr.innerHTML='<div class="section-dot" style="background:'+m.color+'"></div><h3 style="color:'+m.color+'">'+hName+' Hostel</h3><span class="section-pill">'+m.gender+'</span><span class="section-pill">'+m.ac+'</span>';
    grid.appendChild(hdr);

    Object.keys(byFloor).sort().forEach(function(floor){
        const fr=byFloor[floor];
        const fT=fr.reduce(function(a,r){return a+r.total_seats;},0);
        const fO=fr.reduce(function(a,r){return a+r.occupied_seats;},0);
        const fb=document.createElement('div');fb.className='floor-block';
        const frow=document.createElement('div');frow.className='floor-header';
        frow.innerHTML='<span class="floor-chip">Floor '+floor+'</span><div class="floor-divider"></div><span class="floor-count">'+fO+'/'+fT+' occupied</span>';
        fb.appendChild(frow);
        const rg=document.createElement('div');rg.className='rooms-grid';
        fr.forEach(function(room){
            const fp=room.total_seats>0?(room.occupied_seats/room.total_seats)*100:0;
            const sc=room.occupied_seats>=room.total_seats?'full':room.occupied_seats>0?'partial':'';
            const isAC=(hName==='Ivory'||hName==='Chanakya');
            const card=document.createElement('div');
            card.className='room-card '+sc;
            card.title='Click to view details';
            card.innerHTML=
                '<div class="rc-num">Room '+room.room_number+'</div>'+
                '<div class="rc-id">ID: '+room.id+'</div>'+
                '<span class="rc-badge '+(isAC?'ac':'nonac')+'">'+(isAC?'AC':'Non-AC')+' · '+room.total_seats+'-Seater</span>'+
                '<div class="rc-occ"><span>'+room.occupied_seats+'/'+room.total_seats+'</span>'+
                '<div class="occ-bar"><div class="occ-fill" style="width:'+fp+'%"></div></div></div>';
            card.addEventListener('click',function(){openRoomModal(room,hName);});
            rg.appendChild(card);
        });
        fb.appendChild(rg);
        grid.appendChild(fb);
    });
}

// ── ROOM DETAIL MODAL ──
async function openRoomModal(room,hName){
    document.getElementById('room-modal-title').textContent=hName+' — Room '+room.room_number;
    document.getElementById('room-modal-sub').textContent=room.occupied_seats+' / '+room.total_seats+' seats occupied';
    document.getElementById('room-modal-body').innerHTML='<div class="modal-empty">Loading…</div>';
    openModal('room-modal');
    try{
        const res=await fetch(API+'/api/rooms/'+room.id+'/students');
        const students=await res.json();
        const body=document.getElementById('room-modal-body');
        let html='';
        if(!students.length){
            html='<div class="modal-empty">🛏️ No students in this room yet.</div>';
        } else {
            students.forEach(function(s){
                const fc=s.fee_status==='paid'?'paid':'pending';
                const fl=s.fee_status==='paid'?'✅ Paid':'⏳ Pending';
                html+='<div class="modal-student-row">'+
                    '<div><div class="msr-name">'+s.name+'</div><div class="msr-roll">'+s.roll_number+'</div></div>'+
                    '<div style="text-align:right">'+
                        '<span class="fee-badge '+fc+'">'+fl+'</span>'+
                        '<div style="font-size:0.68rem;color:var(--ink3);margin-top:3px">Due: '+fmtDateOnly(s.fee_due_date)+'</div>'+
                    '</div></div>';
            });
        }
        const freeSeats=room.total_seats-students.length;
        if(freeSeats>0){
            html+='<div style="margin-top:10px">';
            for(let i=0;i<freeSeats;i++){
                html+='<div class="modal-student-row" style="opacity:0.45;border-style:dashed">'+
                    '<div><div class="msr-name" style="color:var(--ink3)">Empty Seat</div></div>'+
                    '<span style="font-size:0.72rem;color:var(--ink3)">Available</span></div>';
            }
            html+='</div>'+
                '<button class="modal-btn primary" style="margin-top:14px;width:100%" '+
                'onclick="closeModal(\'room-modal\');'+
                'document.getElementById(\'hostel_select\').value=\''+hName+'\';'+
                'populateRoomDropdown();'+
                'setTimeout(function(){'+
                    'document.getElementById(\'room_select\').value='+room.id+';'+
                    'document.getElementById(\'room_select\').dispatchEvent(new Event(\'change\'))'+
                '},80);'+
                'showPage(\'allotment\')">+ Allot Student Here</button>';
        }
        body.innerHTML=html;
    } catch {
        document.getElementById('room-modal-body').innerHTML='<div class="modal-empty">⚠️ Could not load room details.</div>';
    }
}

// ── STUDENTS ──
function filterStudentHostel(name,btn){
    document.querySelectorAll('#student-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentStudentHostel=name;
    document.getElementById('student-search').value='';
    renderStudentTable(allStudents,name);
}

function renderStudentTable(students,hostelFilter){
    const tbody=document.getElementById('student-table-body');
    const countEl=document.getElementById('student-count');
    const sv=(document.getElementById('student-search').value||'').toLowerCase().trim();
    let f=hostelFilter==='all'?students:students.filter(function(s){return s.hostel_name===hostelFilter;});
    if(sv)f=f.filter(function(s){return s.name.toLowerCase().includes(sv)||s.roll_number.toLowerCase().includes(sv);});
    countEl.textContent=f.length+' student'+(f.length!==1?'s':'');
    if(!f.length){
        tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--ink3);padding:36px">No students found</td></tr>';
        return;
    }
    tbody.innerHTML='';
    f.forEach(function(s){
        const fc=s.fee_status==='paid'?'paid':'pending';
        const fl=s.fee_status==='paid'?'Paid':'Pending';
        const tr=document.createElement('tr');
        tr.innerHTML=
            '<td><strong>'+s.name+'</strong></td>'+
            '<td style="font-family:monospace;font-size:0.8rem;color:var(--accent)">'+s.roll_number+'</td>'+
            '<td>'+(s.hostel_name||'—')+'</td>'+
            '<td>Room '+s.room_number+'</td>'+
            '<td><button class="fee-badge '+fc+'" onclick="openFeeModal(\''+s.roll_number+'\')">'+fl+'</button></td>';
        tbody.appendChild(tr);
    });
}

// ── FEE TRACKING ──
function filterFeeHostel(name,btn){
    document.querySelectorAll('#fee-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentFeeHostel=name;
    document.getElementById('fee-search').value='';
    renderFeeTable();
}

function filterFeeStatus(status,btn){
    document.querySelectorAll('#fee-status-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentFeeStatus=status;
    renderFeeTable();
}

function renderFeeTable(){
    const tbody=document.getElementById('fee-table-body');
    const sv=(document.getElementById('fee-search').value||'').toLowerCase().trim();
    let f=currentFeeHostel==='all'?allStudents:allStudents.filter(function(s){return s.hostel_name===currentFeeHostel;});
    if(currentFeeStatus!=='all')f=f.filter(function(s){return s.fee_status===currentFeeStatus;});
    if(sv)f=f.filter(function(s){return s.name.toLowerCase().includes(sv)||s.roll_number.toLowerCase().includes(sv);});

    const paid=allStudents.filter(function(s){return s.fee_status==='paid';}).length;
    const pending=allStudents.filter(function(s){return s.fee_status==='pending';}).length;
    const due=allStudents.filter(function(s){return s.fee_status==='pending';}).reduce(function(a,s){return a+(parseFloat(s.fee_amount)||0);},0);
    document.getElementById('fee-total-students').textContent=allStudents.length;
    document.getElementById('fee-paid-count').textContent=paid;
    document.getElementById('fee-pending-count').textContent=pending;
    document.getElementById('fee-total-amount').textContent='₹'+due.toLocaleString('en-IN');
    document.getElementById('fee-count').textContent=f.length+' record'+(f.length!==1?'s':'');

    if(!f.length){
        tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--ink3);padding:36px">No records found</td></tr>';
        return;
    }
    tbody.innerHTML='';
    f.forEach(function(s){
        const fc=s.fee_status==='paid'?'paid':'pending';
        const fl=s.fee_status==='paid'?'Paid':'Pending';
        const tr=document.createElement('tr');
        tr.innerHTML=
            '<td><strong>'+s.name+'</strong></td>'+
            '<td style="font-family:monospace;font-size:0.8rem;color:var(--accent)">'+s.roll_number+'</td>'+
            '<td>'+(s.hostel_name||'—')+'</td>'+
            '<td>Room '+s.room_number+'</td>'+
            '<td>'+(s.fee_amount?'₹'+parseFloat(s.fee_amount).toLocaleString('en-IN'):'—')+'</td>'+
            '<td>'+fmtDateOnly(s.fee_due_date)+'</td>'+
            '<td><span class="badge '+fc+'">'+fl+'</span></td>'+
            '<td><button class="tbl-btn edit" onclick="openFeeModal(\''+s.roll_number+'\')">✏️ Edit</button></td>';
        tbody.appendChild(tr);
    });
}

function openFeeModal(roll){
    feeEditRoll=roll;
    const s=allStudents.find(function(s){return s.roll_number===roll;});
    if(!s)return;
    document.getElementById('fee-modal-title').textContent='Update Fee — '+s.name;
    document.getElementById('fee-modal-sub').textContent=s.roll_number+' · '+s.hostel_name+' · Room '+s.room_number;
    document.getElementById('fee-modal-status').value=s.fee_status||'pending';
    document.getElementById('fee-modal-amount').value=s.fee_amount||'';
    document.getElementById('fee-modal-due').value=s.fee_due_date?s.fee_due_date.split('T')[0]:'';
    openModal('fee-modal');
}

async function saveFee(){
    if(!feeEditRoll)return;
    const body={
        fee_status:document.getElementById('fee-modal-status').value,
        fee_amount:parseFloat(document.getElementById('fee-modal-amount').value)||0,
        fee_due_date:document.getElementById('fee-modal-due').value||null
    };
    try{
        const res=await fetch(API+'/api/students/'+feeEditRoll+'/fee',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await res.json();
        if(res.ok){showToast('Fee updated!','success');closeModal('fee-modal');await loadStudentList();}
        else showToast(data.error||'Update failed','error');
    } catch {showToast('Cannot reach server.','error');}
}

// ── LEAVE / OUTPASS ──
function filterLeaveHostel(name,btn){
    document.querySelectorAll('#leave-hostel-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentLeaveHostel=name;
    renderLeaveTable();
}

function filterLeaveStatus(status,btn){
    document.querySelectorAll('#leave-status-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentLeaveStatus=status;
    renderLeaveTable();
}

function renderLeaveTable(){
    const tbody=document.getElementById('leave-table-body');
    const sv=(document.getElementById('leave-search').value||'').toLowerCase().trim();
    let f=currentLeaveHostel==='all'?allLeaves:allLeaves.filter(function(l){return l.hostel_name===currentLeaveHostel;});
    if(currentLeaveStatus!=='all')f=f.filter(function(l){return l.status===currentLeaveStatus;});
    if(sv)f=f.filter(function(l){return l.student_name.toLowerCase().includes(sv)||l.roll_number.toLowerCase().includes(sv);});

    document.getElementById('leave-total').textContent=allLeaves.length;
    document.getElementById('leave-pending').textContent=allLeaves.filter(function(l){return l.status==='pending';}).length;
    document.getElementById('leave-approved').textContent=allLeaves.filter(function(l){return l.status==='approved';}).length;
    document.getElementById('leave-rejected').textContent=allLeaves.filter(function(l){return l.status==='rejected';}).length;
    document.getElementById('leave-count').textContent=f.length+' request'+(f.length!==1?'s':'');

    if(!f.length){
        tbody.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--ink3);padding:36px">No leave requests found</td></tr>';
        return;
    }
    tbody.innerHTML='';
    f.forEach(function(l){
        const sc=l.status==='approved'?'approved':l.status==='rejected'?'rejected':'pending';
        const sl=l.status==='approved'?'Approved':l.status==='rejected'?'Rejected':'Pending';
        let actions='';
        if(l.status==='pending'){
            actions='<button class="tbl-btn approve" onclick="openLeaveActionModal('+l.id+',\'approved\',\''+escHtml(l.student_name)+'\')">✅ Approve</button>'+
                    '<button class="tbl-btn reject"  onclick="openLeaveActionModal('+l.id+',\'rejected\',\''+escHtml(l.student_name)+'\')">❌ Reject</button>';
        } else {
            actions='<button class="tbl-btn del" onclick="openLeaveActionModal('+l.id+',\'pending\',\''+escHtml(l.student_name)+'\')">↩ Reset</button>';
        }
        actions+='<button class="tbl-btn del" onclick="deleteLeave('+l.id+')">🗑</button>';
        const tr=document.createElement('tr');
        tr.innerHTML=
            '<td><strong>'+l.student_name+'</strong></td>'+
            '<td style="font-family:monospace;font-size:0.78rem;color:var(--accent)">'+l.roll_number+'</td>'+
            '<td>'+(l.hostel_name||'—')+'</td>'+
            '<td>'+l.room_number+'</td>'+
            '<td style="font-size:0.78rem">'+fmtDate(l.leave_from)+'</td>'+
            '<td style="font-size:0.78rem">'+fmtDate(l.leave_to)+'</td>'+
            '<td>'+escHtml(l.destination)+'</td>'+
            '<td><span class="badge '+sc+'">'+sl+'</span></td>'+
            '<td><span class="remark-text" title="'+escHtml(l.warden_remark||'')+'">'+escHtml(l.warden_remark||'—')+'</span></td>'+
            '<td>'+actions+'</td>';
        tbody.appendChild(tr);
    });
}

function openLeaveApplyModal(){
    ['leave-roll','leave-from','leave-to','leave-destination','leave-reason','leave-contact'].forEach(function(id){document.getElementById(id).value='';});
    openModal('leave-apply-modal');
}

async function submitLeaveRequest(){
    const body={
        roll_number:document.getElementById('leave-roll').value.trim(),
        leave_from:document.getElementById('leave-from').value,
        leave_to:document.getElementById('leave-to').value,
        destination:document.getElementById('leave-destination').value.trim(),
        reason:document.getElementById('leave-reason').value.trim(),
        contact_number:document.getElementById('leave-contact').value.trim()
    };
    if(!body.roll_number||!body.leave_from||!body.leave_to||!body.destination){
        showToast('Roll number, dates and destination are required','error');return;
    }
    try{
        const res=await fetch(API+'/api/leaves',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await res.json();
        if(res.ok){showToast('Leave request submitted!','success');closeModal('leave-apply-modal');await loadLeaves();}
        else showToast(data.error||'Submission failed','error');
    } catch {showToast('Cannot reach server.','error');}
}

function openLeaveActionModal(id,newStatus,studentName){
    leaveActionId=id;
    const labels={approved:'Approve',rejected:'Reject',pending:'Reset to Pending'};
    const classes={approved:'success',rejected:'danger',pending:'cancel'};
    document.getElementById('leave-action-title').textContent=labels[newStatus]+' Leave Request';
    document.getElementById('leave-action-sub').textContent='Student: '+studentName;
    document.getElementById('leave-remark').value='';
    document.getElementById('leave-action-btns').innerHTML=
        '<button class="modal-btn cancel" onclick="closeModal(\'leave-action-modal\')">Cancel</button>'+
        '<button class="modal-btn '+classes[newStatus]+'" onclick="confirmLeaveAction(\''+newStatus+'\')">'+labels[newStatus]+'</button>';
    openModal('leave-action-modal');
}

async function confirmLeaveAction(status){
    if(!leaveActionId)return;
    const body={status:status,warden_remark:document.getElementById('leave-remark').value.trim()};
    try{
        const res=await fetch(API+'/api/leaves/'+leaveActionId+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await res.json();
        if(res.ok){showToast('Leave '+status+'!','success');closeModal('leave-action-modal');await loadLeaves();}
        else showToast(data.error||'Action failed','error');
    } catch {showToast('Cannot reach server.','error');}
}

async function deleteLeave(id){
    if(!confirm('Delete this leave request?'))return;
    try{
        const res=await fetch(API+'/api/leaves/'+id,{method:'DELETE'});
        if(res.ok){showToast('Deleted','success');await loadLeaves();}
        else{const d=await res.json();showToast(d.error||'Delete failed','error');}
    } catch {showToast('Cannot reach server.','error');}
}

// ── GUEST ENTRY ──
function filterGuestHostel(name,btn){
    document.querySelectorAll('#guest-hostel-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentGuestHostel=name;
    renderGuestTable();
}

function filterGuestStatus(status,btn){
    document.querySelectorAll('#guest-status-tabs .tab').forEach(function(t){t.classList.remove('active');});
    btn.classList.add('active');
    currentGuestStatus=status;
    renderGuestTable();
}

function renderGuestTable(){
    const tbody=document.getElementById('guest-table-body');
    const sv=(document.getElementById('guest-search').value||'').toLowerCase().trim();
    let f=currentGuestHostel==='all'?allGuests:allGuests.filter(function(g){return g.hostel_name===currentGuestHostel;});
    if(currentGuestStatus!=='all')f=f.filter(function(g){return g.status===currentGuestStatus;});
    if(sv)f=f.filter(function(g){
        return g.visitor_name.toLowerCase().includes(sv)||
               g.student_name.toLowerCase().includes(sv)||
               g.student_roll.toLowerCase().includes(sv);
    });

    const today=new Date().toDateString();
    const inside=allGuests.filter(function(g){return g.status==='in';}).length;
    const exitedToday=allGuests.filter(function(g){return g.status==='out'&&g.exit_time&&new Date(g.exit_time).toDateString()===today;}).length;
    document.getElementById('guest-total').textContent=allGuests.length;
    document.getElementById('guest-inside').textContent=inside;
    document.getElementById('guest-exited').textContent=exitedToday;
    document.getElementById('guest-count').textContent=f.length+' entr'+(f.length!==1?'ies':'y');

    if(!f.length){
        tbody.innerHTML='<tr><td colspan="11" style="text-align:center;color:var(--ink3);padding:36px">No guest entries found</td></tr>';
        return;
    }
    tbody.innerHTML='';
    f.forEach(function(g){
        const sc=g.status==='in'?'in':'out';
        const sl=g.status==='in'?'Inside':'Exited';
        let actions='';
        if(g.status==='in')actions+='<button class="tbl-btn exit" onclick="markGuestExit('+g.id+')">🚪 Exit</button>';
        actions+='<button class="tbl-btn del" onclick="deleteGuest('+g.id+')">🗑</button>';
        const tr=document.createElement('tr');
        tr.innerHTML=
            '<td><strong>'+escHtml(g.visitor_name)+'</strong></td>'+
            '<td style="font-size:0.78rem">'+(g.visitor_phone||'—')+'</td>'+
            '<td>'+(g.visitor_relation||'—')+'</td>'+
            '<td>'+escHtml(g.student_name)+'<br><span style="font-family:monospace;font-size:0.68rem;color:var(--accent)">'+g.student_roll+'</span></td>'+
            '<td>'+(g.hostel_name||'—')+'</td>'+
            '<td>'+g.room_number+'</td>'+
            '<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escHtml(g.purpose||'')+'">'+escHtml(g.purpose||'—')+'</td>'+
            '<td style="font-size:0.78rem">'+fmtDate(g.entry_time)+'</td>'+
            '<td style="font-size:0.78rem">'+fmtDate(g.exit_time)+'</td>'+
            '<td><span class="badge '+sc+'">'+sl+'</span></td>'+
            '<td>'+actions+'</td>';
        tbody.appendChild(tr);
    });
}

function openGuestAddModal(){
    ['guest-visitor-name','guest-visitor-phone','guest-relation','guest-student-roll','guest-purpose'].forEach(function(id){document.getElementById(id).value='';});
    openModal('guest-add-modal');
}

async function submitGuestEntry(){
    const body={
        visitor_name:document.getElementById('guest-visitor-name').value.trim(),
        visitor_phone:document.getElementById('guest-visitor-phone').value.trim(),
        visitor_relation:document.getElementById('guest-relation').value.trim(),
        student_roll:document.getElementById('guest-student-roll').value.trim(),
        purpose:document.getElementById('guest-purpose').value.trim()
    };
    if(!body.visitor_name||!body.student_roll){showToast('Visitor name and student roll number are required','error');return;}
    try{
        const res=await fetch(API+'/api/guests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await res.json();
        if(res.ok){showToast('Guest entry logged!','success');closeModal('guest-add-modal');await loadGuests();}
        else showToast(data.error||'Failed to log entry','error');
    } catch {showToast('Cannot reach server.','error');}
}

async function markGuestExit(id){
    try{
        const res=await fetch(API+'/api/guests/'+id+'/exit',{method:'PATCH'});
        if(res.ok){showToast('Guest marked as exited','success');await loadGuests();}
        else{const d=await res.json();showToast(d.error||'Action failed','error');}
    } catch {showToast('Cannot reach server.','error');}
}

async function deleteGuest(id){
    if(!confirm('Delete this guest entry?'))return;
    try{
        const res=await fetch(API+'/api/guests/'+id,{method:'DELETE'});
        if(res.ok){showToast('Deleted','success');await loadGuests();}
        else{const d=await res.json();showToast(d.error||'Delete failed','error');}
    } catch {showToast('Cannot reach server.','error');}
}

// ── ROOM DROPDOWN (allotment form) ──
function populateRoomDropdown(){
    const hostel=document.getElementById('hostel_select').value;
    const select=document.getElementById('room_select');
    document.getElementById('room_id').value='';
    document.getElementById('allot-hint').style.display='none';
    if(!hostel){select.innerHTML='<option value="">-- Select hostel first --</option>';return;}
    const avail=allRooms.filter(function(r){return r.hostel_name===hostel&&r.occupied_seats<r.total_seats;});
    if(!avail.length){select.innerHTML='<option value="">-- No available rooms in '+hostel+' --</option>';return;}
    select.innerHTML='<option value="">-- Select a room --</option>';
    avail.forEach(function(r){
        const o=document.createElement('option');
        o.value=r.id;
        o.textContent='Room '+r.room_number+'  ('+r.occupied_seats+'/'+r.total_seats+' occupied)  ·  ID: '+r.id;
        select.appendChild(o);
    });
}

// ── DATA LOADERS ──
async function loadDashboard(){
    try{
        const res=await fetch(API+'/api/rooms');
        allRooms=await res.json();
        updateLandingStats();
        if(currentDashHostel)renderRoomGrid(currentDashHostel);
        if(document.getElementById('hostel_select').value)populateRoomDropdown();
    } catch(err){
        console.error(err);
        document.getElementById('niq-landing').innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>Cannot connect to server at '+API+'</div>';
    }
}

async function loadStudentList(){
    try{
        const res=await fetch(API+'/api/students');
        allStudents=await res.json();
        renderStudentTable(allStudents,currentStudentHostel);
        renderFeeTable();
    } catch {
        document.getElementById('student-table-body').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--ink3);padding:36px">Could not load students</td></tr>';
    }
}

async function loadMessMenu(){
    try{
        const res=await fetch(API+'/api/mess');
        const menu=await res.json();
        const c=document.getElementById('mess-container');
        c.innerHTML='';
        menu.forEach(function(item){
            const card=document.createElement('div');
            card.className='mess-card';
            card.innerHTML=
                '<div class="mess-day">'+item.day_name+'</div>'+
                '<div class="meal-row"><span class="meal-label">B</span><span class="meal-text">'+item.breakfast+'</span></div>'+
                '<div class="meal-row"><span class="meal-label">L</span><span class="meal-text">'+item.lunch+'</span></div>'+
                '<div class="meal-row"><span class="meal-label">D</span><span class="meal-text">'+item.dinner+'</span></div>';
            c.appendChild(card);
        });
    } catch {
        document.getElementById('mess-container').innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>Could not load mess menu</div>';
    }
}

async function loadLeaves(){
    try{
        const res=await fetch(API+'/api/leaves');
        allLeaves=await res.json();
        renderLeaveTable();
    } catch {
        document.getElementById('leave-table-body').innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--ink3);padding:36px">Could not load leave requests</td></tr>';
    }
}

async function loadGuests(){
    try{
        const res=await fetch(API+'/api/guests');
        allGuests=await res.json();
        renderGuestTable();
    } catch {
        document.getElementById('guest-table-body').innerHTML='<tr><td colspan="11" style="text-align:center;color:var(--ink3);padding:36px">Could not load guest entries</td></tr>';
    }
}

// ── EVENT LISTENERS + INIT ──
document.addEventListener('DOMContentLoaded', function(){

    document.getElementById('hostel_select').addEventListener('change', populateRoomDropdown);

    document.getElementById('room_select').addEventListener('change', function(){
        const rid=this.value;
        document.getElementById('room_id').value=rid;
        if(rid){
            const room=allRooms.find(function(r){return String(r.id)===String(rid);});
            document.getElementById('hint-room').textContent=room?room.room_number:rid;
            document.getElementById('hint-id').textContent=rid;
            document.getElementById('allot-hint').style.display='block';
        } else {
            document.getElementById('allot-hint').style.display='none';
        }
    });

    document.getElementById('allotment-form').addEventListener('submit', async function(e){
        e.preventDefault();
        const room_id=document.getElementById('room_id').value;
        if(!room_id){showToast('Please select a room','error');return;}
        const body={
            name:document.getElementById('student_name').value,
            roll_number:document.getElementById('roll_number').value,
            room_id:parseInt(room_id),
            fee_amount:parseFloat(document.getElementById('fee_amount').value)||0,
            fee_due_date:document.getElementById('fee_due_date').value||null
        };
        try{
            const res=await fetch(API+'/api/allot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
            const data=await res.json();
            if(res.ok){
                showToast('Student allotted successfully!','success');
                document.getElementById('allotment-form').reset();
                document.getElementById('allot-hint').style.display='none';
                document.getElementById('room_select').innerHTML='<option value="">-- Select hostel first --</option>';
                document.getElementById('room_id').value='';
                await loadDashboard();
                await loadStudentList();
            } else showToast(data.error||'Allotment failed','error');
        } catch {showToast('Cannot reach server.','error');}
    });

    document.getElementById('checkout-btn').addEventListener('click', async function(){
        const roll=document.getElementById('checkout_roll').value.trim();
        if(!roll){showToast('Enter a roll number','error');return;}
        try{
            const res=await fetch(API+'/api/checkout/'+roll,{method:'DELETE'});
            const data=await res.json();
            if(res.ok){
                showToast('Student checked out!','success');
                document.getElementById('checkout_roll').value='';
                await loadDashboard();
                await loadStudentList();
            } else showToast(data.error||'Student not found','error');
        } catch {showToast('Cannot reach server.','error');}
    });

    // Close modals when clicking overlay background
    document.querySelectorAll('.modal-overlay').forEach(function(o){
        o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
    });
});

// ── PAGE LOAD ──
window.addEventListener('load', async function(){
    await loadDashboard();
    await loadStudentList();
    await loadMessMenu();
    await loadLeaves();
    await loadGuests();
    showLanding();
});