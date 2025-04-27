const brevo = require('@getbrevo/brevo');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Método no permitido" }),
    };
  }

  try {
    const { nombre, apellido, email, ciudad, edad, objetivo, categoria } = JSON.parse(event.body);

    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );

    const senderInfo = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME,
    };

    const htmlContent = `
      <h2>Nuevo registro</h2>
      <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Ciudad:</strong> ${ciudad}</p>
      <p><strong>Edad:</strong> ${edad}</p>
      <p><strong>Objetivo:</strong> ${objetivo}</p>
      <p><strong>Categoría:</strong> ${categoria || 'N/A'}</p>
    `;

    // 1. Email de notificación al admin (Technical)
    const notificationEmail = new brevo.SendSmtpEmail({
      to: [{ email: process.env.ADMIN_NOTIFICATION_EMAIL, name: 'Equipo Jelpmi' }],
      sender: senderInfo,
      subject: 'Nuevo registro en Jelpmi',
      htmlContent,
    });

    // 1. Email de notificación al admin (Support)
    const notificationEmailSupport = new brevo.SendSmtpEmail({
      to: [{ email: process.env.SUPPORT_NOTIFICATION_EMAIL, name: 'Equipo Jelpmi' }],
      sender: senderInfo,
      subject: 'Nuevo registro en Jelpmi',
      htmlContent,
    });

    // Enviar correos de notificación
    await Promise.all([
      brevoApi.sendTransacEmail(notificationEmail),
      brevoApi.sendTransacEmail(notificationEmailSupport),
    ]);

    // 2. Email de bienvenida al usuario (Loops)
    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LOOPS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionalId: process.env.LOOPS_TEMPLATE_ID,
        email,
        addToAudience: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error enviando correo con Loops:', errorData);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Correos enviados exitosamente" }),
    };

  } catch (error) {
    console.error('Error al enviar correos:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al enviar correos", error: error.message }),
    };
  }
};
