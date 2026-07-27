document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registroForm');
  if (!form) return;

  const phoneInput = document.getElementById('regPhone');
  let iti;

  if (phoneInput) {
    iti = window.intlTelInput(phoneInput, {
      initialCountry: 'bo',
      separateDialCode: true,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@24/build/js/utils.js',
    });
  }

  const msg = document.getElementById('regMsg');
  const submitBtn = document.getElementById('regSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('regNombre').value.trim();
    const apellido = document.getElementById('regApellido').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const mensaje = document.getElementById('regMensaje').value.trim();
    const phone = iti ? iti.getNumber() : (phoneInput ? phoneInput.value.trim() : '');

    if (!nombre || !apellido || !email) {
      msg.textContent = 'Por favor llena los campos obligatorios (*).';
      msg.style.color = '#e74c3c';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    msg.textContent = '';
    msg.style.color = '';

    try {
      const { error } = await supabase.from('members').insert({
        first_name: nombre,
        last_name: apellido,
        email: email,
        phone: phone,
        notes: mensaje || null,
        registered_by: 'website',
      });

      if (error) throw error;

      msg.textContent = '¡Gracias por registrarte! Te esperamos este domingo.';
      msg.style.color = '#2ecc71';
      form.reset();
      if (iti) iti.setNumber('');
    } catch (err) {
      msg.textContent = 'Ocurrió un error. Intenta de nuevo más tarde.';
      msg.style.color = '#e74c3c';
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Registro';
    }
  });
});
