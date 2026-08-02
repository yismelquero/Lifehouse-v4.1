document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registroForm');
  if (!form) return;

  const phoneInput = document.getElementById('regPhone');
  let iti;

  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      initialCountry: 'bo',
      separateDialCode: true,
      loadUtilsOnInit: 'assets/vendor/intl-tel-input/utils.js',
    });
  }

  const msg = document.getElementById('regMsg');
  const submitBtn = document.getElementById('regSubmit');
  const kidsFields = document.getElementById('regNinosFields');
  const kidsDetails = document.getElementById('regNinosDetalles');

  document.querySelectorAll('input[name="regConNinos"]').forEach((input) => {
    input.addEventListener('change', () => {
      const bringingKids = input.value === 'Sí' && input.checked;
      kidsFields.hidden = !bringingKids;
      kidsDetails.required = bringingKids;
      if (!bringingKids) kidsDetails.value = '';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('regNombre').value.trim();
    const phone = iti ? iti.getNumber() : (phoneInput ? phoneInput.value.trim() : '');
    const reunion = document.getElementById('regReunion').value;
    const conNinos = document.querySelector('input[name="regConNinos"]:checked')?.value || '';
    const primeraVez = document.querySelector('input[name="regPrimeraVez"]:checked')?.value || '';
    const ninosDetalles = kidsDetails.value.trim();
    const ayuda = document.getElementById('regAyuda').value;
    const mensaje = document.getElementById('regMensaje').value.trim();

    if (!nombre || !phone || !reunion || !conNinos || !primeraVez || (conNinos === 'Sí' && !ninosDetalles)) {
      msg.textContent = 'Por favor llena los campos obligatorios (*).';
      msg.style.color = '#e74c3c';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    msg.textContent = '';
    msg.style.color = '';

    try {
      const visitNotes = [
        `Reunión: ${reunion}`,
        `Vendrá con niños: ${conNinos}`,
        conNinos === 'Sí' ? `Niños y edades: ${ninosDetalles}` : null,
        `Primera vez en LifeHouse: ${primeraVez}`,
        ayuda ? `Podemos ayudarle con: ${ayuda}` : null,
        mensaje ? `Mensaje: ${mensaje}` : null,
      ].filter(Boolean).join('\n');

      const { error } = await supabase.from('members').insert({
        first_name: nombre,
        last_name: 'Visita',
        phone: phone,
        notes: visitNotes,
        registered_by: 'website',
      });

      if (error) throw error;

      msg.textContent = '¡Gracias por avisarnos! Estaremos esperándote.';
      msg.style.color = '#2ecc71';
      form.reset();
      if (iti) iti.setNumber('');
      kidsFields.hidden = true;
      kidsDetails.required = false;
    } catch (err) {
      msg.textContent = 'Ocurrió un error. Intenta de nuevo más tarde.';
      msg.style.color = '#e74c3c';
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Avisar que voy';
    }
  });
});
