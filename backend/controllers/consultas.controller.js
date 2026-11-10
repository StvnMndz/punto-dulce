// Controlador de consultas: valida el formulario público y atiende la bandeja del personal.
const consultaDao = require('../daos/consulta.dao');

const TEMAS_PERMITIDOS = [
  'Pedido y seguimiento',
  'Productos y disponibilidad',
  'Delivery y pagos',
  'Evento o pedido por encargo',
  'Otra consulta'
];

exports.crear = async (req, res) => {
  const cuerpo = req.body || {};
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
  const contacto = typeof cuerpo.contacto === 'string' ? cuerpo.contacto.trim() : '';
  const tema = typeof cuerpo.tema === 'string' ? cuerpo.tema.trim() : '';
  const mensaje = typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje.trim() : '';

  if (nombre.length < 2 || nombre.length > 100) return res.status(400).json({ error: 'Escribe un nombre de entre 2 y 100 caracteres.' });
  if (contacto.length < 3 || contacto.length > 120) return res.status(400).json({ error: 'Escribe un correo o teléfono válido.' });
  if (!TEMAS_PERMITIDOS.includes(tema)) return res.status(400).json({ error: 'Selecciona un tema de consulta válido.' });
  if (mensaje.length < 5 || mensaje.length > 1000) return res.status(400).json({ error: 'El mensaje debe tener entre 5 y 1000 caracteres.' });

  try {
    const id = await consultaDao.create({ nombre, contacto, tema, mensaje });
    return res.status(201).json({ ok: true, id, mensaje: 'Consulta enviada correctamente.' });
  } catch (error) {
    console.error('Error al guardar consulta:', error.code || error.message);
    return res.status(500).json({ error: 'No se pudo guardar la consulta. Inténtalo más tarde.' });
  }
};

exports.listar = async (_req, res) => {
  try {
    return res.json(await consultaDao.findMany());
  } catch (error) {
    console.error('Error al listar consultas:', error.code || error.message);
    return res.status(500).json({ error: 'No se pudieron cargar las consultas.' });
  }
};
