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
  //ok
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Método no permitido" }),
    };
  }

  try {

    
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );
    
    const body = JSON.parse(event.body);
    const { nombre, apellido, email, ciudad, edad, objetivo, categoria } = body;

    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Authorization': process.env.LOOPS_API_KEY, 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionalId: process.env.LOOPS_TEMPLATE_ID ,
        email: email,
        addToAudience: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error al enviar correo con Loops:', errorData);
    } else {
      console.log('Correo enviado correctamente con Loops.');
    }
    
    // 1. Email de notificación al admin
    const notificationEmail = new brevo.SendSmtpEmail();
    Object.assign(notificationEmail, {
      to: [{ email: process.env.ADMIN_NOTIFICATION_EMAIL, name: 'Equipo Jelpmi' }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      subject: 'Nuevo registro en Jelpmi',
      htmlContent: `
        <h2>Nuevo registro</h2>
        <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Ciudad:</strong> ${ciudad}</p>
        <p><strong>Edad:</strong> ${edad}</p>
        <p><strong>Objetivo:</strong> ${objetivo}</p>
        <p><strong>Categoría:</strong> ${categoria || 'N/A'}</p>
      `,
    });

    const notificationEmailSupport  = new brevo.SendSmtpEmail();
    Object.assign(notificationEmailSupport, {
      to: [{ email: process.env.SUPPORT_NOTIFICATION_EMAIL, name: 'Equipo Jelpmi' }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      subject: 'Nuevo registro en Jelpmi',
      htmlContent: `
        <h2>Nuevo registro</h2>
        <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Ciudad:</strong> ${ciudad}</p>
        <p><strong>Edad:</strong> ${edad}</p>
        <p><strong>Objetivo:</strong> ${objetivo}</p>
        <p><strong>Categoría:</strong> ${categoria || 'N/A'}</p>
      `,
    });

    await apiInstance.sendTransacEmail(notificationEmail);
    await apiInstance.sendTransacEmail(notificationEmailSupport);

    // 2. Email de bienvenida al usuario
    const userEmail = new brevo.SendSmtpEmail();
    Object.assign(userEmail, {
      to: [{ email: email, name: nombre }],
      subject: '¡Bienvenido a la lista de espera!',
      templateId: Number(process.env.BREVO_TEMPLATE_ID),
    });

    await apiInstance.sendTransacEmail(userEmail);

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
