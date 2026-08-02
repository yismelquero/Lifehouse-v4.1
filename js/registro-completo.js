document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registroCompletoForm');
  if (!form) return;

  const msg = document.getElementById('rcMsg');
  const submitBtn = document.getElementById('rcSubmit');

  function showMessage(text, color, state) {
    msg.textContent = text;
    msg.style.color = color;
    msg.dataset.state = state;
  }

  function clearErrorMessage() {
    if (msg.dataset.state !== 'error') return;
    msg.textContent = '';
    msg.style.color = '';
    delete msg.dataset.state;
  }

  // Al corregir cualquier respuesta, retira de inmediato el error anterior.
  form.addEventListener('input', clearErrorMessage);
  form.addEventListener('change', clearErrorMessage);

  // ── Teléfono internacional ──
  const phoneInput = document.getElementById('rcPhone');
  let iti;
  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      initialCountry: 'bo',
      separateDialCode: true,
      loadUtilsOnInit: 'assets/vendor/intl-tel-input/utils.js',
    });
  }

  // ── Edad automática desde la fecha de nacimiento ──
  const nacimientoEl = document.getElementById('rcNacimiento');
  const edadEl = document.getElementById('rcEdad');
  function calcAge() {
    if (!nacimientoEl || !edadEl || !nacimientoEl.value) {
      if (edadEl) edadEl.value = '';
      return;
    }
    const hoy = new Date();
    const nac = new Date(`${nacimientoEl.value}T00:00:00`);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    edadEl.value = edad >= 0 && edad <= 120 ? edad : '';
  }
  if (nacimientoEl) nacimientoEl.addEventListener('change', calcAge);

  // ── Campos condicionales ──
  const familiaFields = document.getElementById('rcFamiliaFields');
  document.querySelectorAll('input[name="rcConFamilia"]').forEach((input) => {
    input.addEventListener('change', () => {
      familiaFields.hidden = input.value !== 'Sí';
    });
  });

  const invitadoFields = document.getElementById('rcInvitadoFields');
  const comoConociste = document.getElementById('rcComoConociste');
  comoConociste.addEventListener('change', () => {
    invitadoFields.hidden = comoConociste.value !== 'Invitación de un amigo';
  });

  const casaVidaFields = document.getElementById('rcCasaVidaFields');
  document.querySelectorAll('input[name="rcCasaVida"]').forEach((input) => {
    input.addEventListener('change', () => {
      casaVidaFields.hidden = input.value !== 'Sí';
    });
  });

  // ── Lectura segura de campos ──
  function readValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function readRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  }

  // ── Envío ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      showMessage('Por favor completa los campos obligatorios (*).', '#e74c3c', 'error');
      return;
    }

    // Guarda por separado el prefijo internacional y el número nacional.
    const fullPhone = iti ? iti.getNumber() : (phoneInput ? phoneInput.value.trim() : '');
    const dialCode = iti ? String(iti.getSelectedCountryData().dialCode || '') : '';
    const phoneDigits = fullPhone.replace(/\D/g, '');
    const countryCode = dialCode ? `+${dialCode}` : null;
    const phone = dialCode && phoneDigits.startsWith(dialCode)
      ? phoneDigits.slice(dialCode.length)
      : phoneDigits;

    if (!phone) {
      showMessage('Por favor ingresa un número de WhatsApp válido.', '#e74c3c', 'error');
      return;
    }

    const age = readValue('rcEdad');
    const childrenCount = readValue('rcCantHijos');
    const payload = {
      first_name: readValue('rcNombres'),
      last_name: readValue('rcApellidos'),
      birth_date: readValue('rcNacimiento') || null,
      age: age ? parseInt(age, 10) : null,
      gender: readValue('rcGenero') || null,
      phone,
      country_code: countryCode,
      email: readValue('rcEmail') || null,
      zona: readValue('rcZona') || null,
      estado_civil: readRadio('rcEstadoCivil') || null,
      con_familia: readRadio('rcConFamilia') || null,
      esposo: readValue('rcEsposo') || null,
      hijos_lh: readRadio('rcHijosLH') || null,
      cantidad_hijos: childrenCount ? parseInt(childrenCount, 10) : null,
      edades_hijos: readValue('rcEdadesHijos') || null,
      primera_vez: readRadio('rcPrimeraVez') || null,
      como_conociste: comoConociste.value || null,
      invitado_por: readValue('rcInvitadoPor') || null,
      entregado_vida: readValue('rcEntregadoVida') || null,
      bautizado: readRadio('rcBautizado') || null,
      casa_vida: readRadio('rcCasaVida') || null,
      casa_vida_cual: readValue('rcCasaVidaCual') || null,
      info_whatsapp: readRadio('rcInfoWhatsapp') || null,
      registered_by: 'website',
    };

    const minimalPayload = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone,
      country_code: countryCode,
      registered_by: 'website',
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    msg.textContent = '';
    msg.style.color = '';
    delete msg.dataset.state;

    try {
      // Primero usa el esquema completo. Si la base aún no fue migrada,
      // reintenta con las columnas mínimas para no perder el registro.
      const firstTry = await supabase.from('members').insert(payload);
      if (firstTry.error) {
        const retry = await supabase.from('members').insert(minimalPayload);
        if (retry.error) throw retry.error;
      }

      showMessage('¡Gracias por registrarte! Nos pondremos en contacto contigo pronto.', '#2ecc71', 'success');
      form.reset();
      if (iti) iti.setNumber('');
      familiaFields.hidden = true;
      invitadoFields.hidden = true;
      casaVidaFields.hidden = true;
    } catch (err) {
      showMessage('Ocurrió un error. Intenta de nuevo más tarde.', '#e74c3c', 'error');
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Completar registro';
    }
  });
});
