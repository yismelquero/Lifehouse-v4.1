document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registroCompletoForm');
  if (!form) return;

  const msg = document.getElementById('rcMsg');
  const submitBtn = document.getElementById('rcSubmit');

  // ── Teléfono internacional ──
  const phoneInput = document.getElementById('rcPhone');
  let iti;
  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      initialCountry: 'bo',
      separateDialCode: true,
      loadUtilsOnInit: 'https://cdn.jsdelivr.net/npm/intl-tel-input@24/build/js/utils.js',
    });
  }

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

  // ── Envío ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      msg.textContent = 'Por favor completa los campos obligatorios (*).';
      msg.style.color = '#e74c3c';
      return;
    }

    const nombres = document.getElementById('rcNombres').value.trim();
    const apellidos = document.getElementById('rcApellidos').value.trim();
    const nacimiento = document.getElementById('rcNacimiento').value;
    const edad = document.getElementById('rcEdad').value;
    const genero = document.getElementById('rcGenero').value;
    const phone = iti ? iti.getNumber() : (phoneInput ? phoneInput.value.trim() : '');
    const email = document.getElementById('rcEmail').value.trim();
    const zona = document.getElementById('rcZona').value.trim();

    const estadoCivil = document.querySelector('input[name="rcEstadoCivil"]:checked')?.value || '';
    const conFamilia = document.querySelector('input[name="rcConFamilia"]:checked')?.value || '';
    const esposo = document.getElementById('rcEsposo').value.trim();
    const hijosLH = document.querySelector('input[name="rcHijosLH"]:checked')?.value || '';
    const cantHijos = document.getElementById('rcCantHijos').value;
    const edadesHijos = document.getElementById('rcEdadesHijos').value.trim();

    const primeraVez = document.querySelector('input[name="rcPrimeraVez"]:checked')?.value || '';
    const conociste = comoConociste.value;
    const invitadoPor = document.getElementById('rcInvitadoPor').value.trim();
    const entregadoVida = document.getElementById('rcEntregadoVida').value;
    const bautizado = document.querySelector('input[name="rcBautizado"]:checked')?.value || '';
    const casaVida = document.querySelector('input[name="rcCasaVida"]:checked')?.value || '';
    const casaVidaCual = document.getElementById('rcCasaVidaCual').value.trim();
    const infoWhatsapp = document.querySelector('input[name="rcInfoWhatsapp"]:checked')?.value || '';

    if (!phone) {
      msg.textContent = 'Por favor ingresa un número de WhatsApp válido.';
      msg.style.color = '#e74c3c';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    msg.textContent = '';
    msg.style.color = '';

    try {
      const notes = [
        '— INFORMACIÓN PERSONAL —',
        `Fecha de nacimiento: ${nacimiento}`,
        `Edad: ${edad}`,
        `Género: ${genero}`,
        email ? `Correo: ${email}` : null,
        zona ? `Zona: ${zona}` : null,
        '',
        '— INFORMACIÓN FAMILIAR —',
        `Estado civil: ${estadoCivil}`,
        `¿Viene con familia?: ${conFamilia}`,
        conFamilia === 'Sí' && esposo ? `Nombre del esposo/a: ${esposo}` : null,
        conFamilia === 'Sí' && hijosLH ? `¿Hijos que asisten a LifeHouse?: ${hijosLH}` : null,
        conFamilia === 'Sí' && cantHijos ? `Cantidad de hijos: ${cantHijos}` : null,
        conFamilia === 'Sí' && edadesHijos ? `Edades de los hijos: ${edadesHijos}` : null,
        '',
        '— VIDA ESPIRITUAL —',
        `¿Primera vez en LifeHouse?: ${primeraVez}`,
        `¿Cómo conoció LifeHouse?: ${conociste}`,
        conociste === 'Invitación de un amigo' && invitadoPor ? `Invitado por: ${invitadoPor}` : null,
        `¿Ha entregado su vida a Jesús?: ${entregadoVida}`,
        `¿Bautizado en agua?: ${bautizado}`,
        `¿Forma parte de una Casa Vida?: ${casaVida}`,
        casaVida === 'Sí' && casaVidaCual ? `Cuál Casa Vida: ${casaVidaCual}` : null,
        `¿Recibir información por WhatsApp?: ${infoWhatsapp}`,
      ].filter((line) => line !== null).join('\n');

      const { error } = await supabase.from('members').insert({
        first_name: nombres,
        last_name: apellidos,
        phone: phone,
        notes: notes,
        registered_by: 'website',
      });

      if (error) throw error;

      msg.textContent = '¡Gracias por registrarte! Nos pondremos en contacto contigo pronto.';
      msg.style.color = '#2ecc71';
      form.reset();
      if (iti) iti.setNumber('');
      familiaFields.hidden = true;
      invitadoFields.hidden = true;
      casaVidaFields.hidden = true;
    } catch (err) {
      msg.textContent = 'Ocurrió un error. Intenta de nuevo más tarde.';
      msg.style.color = '#e74c3c';
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Completar registro';
    }
  });
});
