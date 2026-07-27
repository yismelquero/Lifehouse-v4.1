/* ── AUTH GUARD (Supabase Auth) ──
   La sesión la maneja Supabase (JWT), no hay usuario/contraseña
   escritos en el código. Para crear el usuario admin, ve a tu
   proyecto de Supabase → Authentication → Users → Add user,
   y da de alta el correo/contraseña que usarán para entrar aquí. */
(async function checkAuth() {
  const path = window.location.pathname;
  const isLoginPage = path.includes('admin/index.html') || path === '/admin/' || path.endsWith('/admin') || path.endsWith('/admin/');

  const { data: { session } } = await supabase.auth.getSession();

  if (isLoginPage) {
    // Si ya hay una sesión válida, saltar directo al panel.
    if (session) window.location.replace('miembros.html');
    return;
  }

  if (!session) {
    window.location.replace('index.html');
  }
})();

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const msg = document.getElementById('loginMsg');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Ingresando...'; }
    msg.textContent = '';

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
      msg.textContent = 'Correo o contraseña incorrectos.';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Ingresar'; }
      return;
    }

    window.location.replace('miembros.html');
  });
}

function logout() {
  supabase.auth.signOut().then(() => window.location.replace('index.html'));
}

/* ── STATE ── */
let allMembers = [];
let casasList = [];
let areasList = [];
let editingId = null;
let assignMemberId = null;

/* ── LOAD DATA ── */
async function loadData() {
  const [membersRes, casasRes, areasRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: false }),
    supabase.from('casas_vida').select('*'),
    supabase.from('areas_servicio').select('*'),
  ]);

  if (membersRes.error) return console.error(membersRes.error);
  allMembers = membersRes.data || [];
  casasList = casasRes.data || [];
  areasList = areasRes.data || [];

  const casasMap = {};
  const areasMap = {};

  if (allMembers.length > 0) {
    const ids = allMembers.map(m => m.id);
    const [mcRes, maRes] = await Promise.all([
      supabase.from('member_casas_vida').select('*').in('member_id', ids),
      supabase.from('member_areas').select('*').in('member_id', ids),
    ]);
    if (mcRes.data) mcRes.data.forEach(r => {
      if (!casasMap[r.member_id]) casasMap[r.member_id] = [];
      casasMap[r.member_id].push(r.casa_vida_id);
    });
    if (maRes.data) maRes.data.forEach(r => {
      if (!areasMap[r.member_id]) areasMap[r.member_id] = [];
      areasMap[r.member_id].push(r.area_id);
    });
  }

  renderTable(allMembers, casasMap, areasMap);
}

/* ── RENDER TABLE ── */
function renderTable(members, casasMap = {}, areasMap = {}) {
  const tbody = document.getElementById('membersTable');
  const empty = document.getElementById('emptyState');
  if (!tbody) return;

  if (members.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.innerHTML = '<p>No hay miembros registrados aún.</p>';
    return;
  }
  if (empty) empty.innerHTML = '';

  tbody.innerHTML = members.map(m => {
    const casas = (casasMap[m.id] || []).map(id => {
      const c = casasList.find(cv => cv.id === id);
      return c ? c.name : '';
    }).filter(Boolean).join(', ');

    const areas = (areasMap[m.id] || []).map(id => {
      const a = areasList.find(ar => ar.id === id);
      return a ? a.name : '';
    }).filter(Boolean).join(', ');

    const edad = m.age ? `${m.age} años` : '—';
    const genero = m.gender || '—';

    return `<tr>
      <td><strong>${esc(m.first_name)} ${esc(m.last_name || '')}</strong></td>
      <td>${esc(m.email || '—')}</td>
      <td>${esc(m.phone || '—')}</td>
      <td>${edad}</td>
      <td>${genero}</td>
      <td style="font-size:0.78rem;color:rgba(255,255,255,0.6);max-width:140px;">${esc(casas) || '—'}</td>
      <td style="font-size:0.78rem;color:rgba(255,255,255,0.6);max-width:140px;">${esc(areas) || '—'}</td>
      <td>
        <div class="cell-actions">
          <button class="btn-edit" onclick="openEdit('${m.id}')">Editar</button>
          <button class="btn-assign" onclick="openAssign('${m.id}')">Asignar</button>
          <button class="btn-delete" onclick="deleteMember('${m.id}')">Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── MODAL: CREAR / EDITAR ── */
function openModal(data = null) {
  editingId = data ? data.id : null;
  const isEdit = !!editingId;
  const title = isEdit ? 'Editar Miembro' : 'Nuevo Miembro';

  const genderOpts = ['', 'Masculino', 'Femenino', 'Prefiero no decirlo'].map(g =>
    `<option value="${g}" ${data && data.gender === g ? 'selected' : ''}>${g || 'Seleccionar...'}</option>`
  ).join('');

  document.getElementById('modalContainer').innerHTML = `
    <div class="admin-overlay" onclick="if(event.target===this) closeModal()">
      <div class="admin-modal">
        <h3>${title}</h3>
        <form id="memberForm">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre *</label>
              <input type="text" id="fNombre" value="${esc(data ? data.first_name : '')}" required>
            </div>
            <div class="form-group">
              <label>Apellido *</label>
              <input type="text" id="fApellido" value="${esc(data ? data.last_name : '')}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fecha de Nacimiento</label>
              <input type="date" id="fBirth" value="${data && data.birth_date ? data.birth_date : ''}" onchange="calcAge()">
            </div>
            <div class="form-group">
              <label>Edad</label>
              <input type="number" id="fAge" value="${data && data.age ? data.age : ''}" readonly style="opacity:0.6;">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Género</label>
              <select id="fGender">${genderOpts}</select>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="fEmail" value="${esc(data ? data.email : '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Celular</label>
              <input type="text" id="fPhone" value="${esc(data ? data.phone : '')}" placeholder="+591 70000000">
            </div>
            <div class="form-group">
              <label>Foto (URL)</label>
              <input type="url" id="fPhoto" value="${esc(data ? data.photo_url : '')}" placeholder="https://...">
            </div>
          </div>
          <div class="form-group">
            <label>Notas</label>
            <textarea id="fNotes" rows="2">${esc(data ? data.notes : '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="admin-btn admin-btn-ghost" onclick="closeModal()" style="flex:1;border-radius:10px;">Cancelar</button>
            <button type="submit" class="admin-btn admin-btn-solid" style="flex:1;border-radius:10px;">${isEdit ? 'Guardar Cambios' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
  editingId = null;
  assignMemberId = null;
}

function calcAge() {
  const birth = document.getElementById('fBirth').value;
  if (!birth) return;
  const today = new Date();
  const bd = new Date(birth);
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  document.getElementById('fAge').value = age;
}

/* ── SUBMIT: MEMBER FORM ── */
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'memberForm') {
    e.preventDefault();
    const data = {
      first_name: document.getElementById('fNombre').value.trim(),
      last_name: document.getElementById('fApellido').value.trim(),
      birth_date: document.getElementById('fBirth').value || null,
      age: document.getElementById('fAge').value ? parseInt(document.getElementById('fAge').value) : null,
      gender: document.getElementById('fGender').value || null,
      email: document.getElementById('fEmail').value.trim() || null,
      phone: document.getElementById('fPhone').value.trim() || null,
      photo_url: document.getElementById('fPhoto').value.trim() || null,
      notes: document.getElementById('fNotes').value.trim() || null,
    };
    if (!data.first_name || !data.last_name) return alert('Nombre y apellido son obligatorios.');
    try {
      if (editingId) {
        const { error } = await supabase.from('members').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        data.registered_by = 'admin';
        const { error } = await supabase.from('members').insert(data);
        if (error) throw error;
      }
      closeModal();
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  /* ── SUBMIT: ASSIGN FORM ── */
  if (e.target.id === 'assignForm') {
    e.preventDefault();
    if (!assignMemberId) return;

    const casaChecks = Array.from(e.target.querySelectorAll('.admin-checkbox-grid:first-of-type input[type="checkbox"]'));
    const areaChecks = Array.from(e.target.querySelectorAll('.admin-checkbox-grid:last-of-type input[type="checkbox"]'));

    const selectedCasas = casaChecks.filter(c => c.checked).map(c => c.value);
    const selectedAreas = areaChecks.filter(c => c.checked).map(c => c.value);

    try {
      await supabase.from('member_casas_vida').delete().eq('member_id', assignMemberId);
      await supabase.from('member_areas').delete().eq('member_id', assignMemberId);

      if (selectedCasas.length > 0) {
        const { error } = await supabase.from('member_casas_vida').insert(
          selectedCasas.map(casa_vida_id => ({ member_id: assignMemberId, casa_vida_id }))
        );
        if (error) throw error;
      }
      if (selectedAreas.length > 0) {
        const { error } = await supabase.from('member_areas').insert(
          selectedAreas.map(area_id => ({ member_id: assignMemberId, area_id }))
        );
        if (error) throw error;
      }
      closeModal();
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
});

/* ── EDIT / DELETE ── */
function openEdit(id) {
  const member = allMembers.find(m => m.id === id);
  if (member) openModal(member);
}

async function deleteMember(id) {
  if (!confirm('¿Eliminar este miembro permanentemente?')) return;
  try {
    await supabase.from('member_casas_vida').delete().eq('member_id', id);
    await supabase.from('member_areas').delete().eq('member_id', id);
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
    loadData();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

/* ── ASSIGN ── */
function openAssign(memberId) {
  assignMemberId = memberId;
  const member = allMembers.find(m => m.id === memberId);
  if (!member) return;

  const name = `${member.first_name} ${member.last_name}`;

  Promise.all([
    supabase.from('member_casas_vida').select('casa_vida_id').eq('member_id', memberId),
    supabase.from('member_areas').select('area_id').eq('member_id', memberId),
  ]).then(([mcRes, maRes]) => {
    const selectedCasas = (mcRes.data || []).map(r => r.casa_vida_id);
    const selectedAreas = (maRes.data || []).map(r => r.area_id);

    document.getElementById('modalContainer').innerHTML = `
      <div class="admin-overlay" onclick="if(event.target===this) closeModal()">
        <div class="admin-modal">
          <h3>Asignar: ${esc(name)}</h3>
          <form id="assignForm">
            <div class="form-group">
              <label>Casas Vida</label>
              <div class="admin-checkbox-grid">
                ${casasList.map(c => `
                  <label><input type="checkbox" value="${c.id}" ${selectedCasas.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>Áreas de Servicio</label>
              <div class="admin-checkbox-grid">
                ${areasList.map(a => `
                  <label><input type="checkbox" value="${a.id}" ${selectedAreas.includes(a.id) ? 'checked' : ''}> ${esc(a.name)}</label>
                `).join('')}
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="admin-btn admin-btn-ghost" onclick="closeModal()" style="flex:1;border-radius:10px;">Cancelar</button>
              <button type="submit" class="admin-btn admin-btn-solid" style="flex:1;border-radius:10px;">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  });
}

/* ── SEARCH ── */
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    const filtered = allMembers.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
    renderTable(filtered);
  });
}

/* ── INIT ── */
if (window.location.pathname.includes('miembros')) {
  document.addEventListener('DOMContentLoaded', loadData);
}
