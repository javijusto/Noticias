const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const conexion = require("../conexion.js");

const login = async (req, res) => {
  const { nombre, pass } = req.body;

  if (!nombre || !pass) { //comprueba parametros body
    res.sendStatus(400);
    return;
  }

  const sqlGetUser = `select * from usuarios where nombre="${nombre}"`; //usuario existe
  const conectado = await conexion.getConnection();
  const usuarios = await conectado.query(sqlGetUser);

  if (usuarios[0].length === 0) {//usurio existe
    res.sendStatus(403);
    conectado.release();
    return;
  }

  if (usuarios[0][0].active === 0) {//usuario logueado
    res.sendStatus(403);
    conectado.release();
    return;
  }

  const passwordsIguales = await bcrypt.compare(
    pass,
    usuarios[0][0].pass
  );//compara pass

  if (!passwordsIguales) {
    res.sendStatus(403);

    conectado.release();
    return;
  }

  const infoUsuario = {
    id: usuarios[0][0].id,
  };

  var token = jwt.sign(infoUsuario, process.env.SECRET, {
    expiresIn: "30d",
  });//token generado

  res.send({
    data: token,
  });//envio token
};

const registrarUsuario = async (request, response) => {
  //post (user, pass) en el body
  const {nombre, pass, email} = request.body;
  if (!nombre || !pass || !email) {
    response.sendStatus(400); //si faltan parametros Error 400
    return;
  }

  const conectado = await conexion.getConnection(); //conexion 
  const usuarion = await conectado.query(
    `select * from usuarios where nombre="${nombre}"`);

  if(usuarion[0].length !==0){ //si ya existe manda Conflict 409
    response.sendStatus(409);
    conectado.release(); //libera conexion
    return;
  }

  const usuarioe = await conectado.query(
    `select * from usuarios where email="${email}"`);

  if(usuarioe[0].length !==0){ //si ya existe manda Conflict 409
    response.sendStatus(409);
    conectado.release(); //libera conexion
    return;
  }

  const hash = await bcrypt.hash(pass, 10); //encriptacion de datos
  await conectado.query(
    `Insert into usuarios values (null, "${nombre}", "${email}", null, null, "${hash}")`);

  conectado.release();  
  response.send(`Usuario ${nombre} registrado`);
};

const editarUsuario = async (request, response) => {
  let {id, nombre, email, bio, foto, pass } = request.body;
  
  const token = request.headers.authorization;
  const infoUsuario = jwt.decode(token, process.env.SECRET);

  const conectado = await conexion.getConnection(); //conexion 
  const usuario = await conectado.query(`select * from usuarios where id="${id}"`);

  if(usuario[0].length ===0){ //si no existe manda Conflict 409
    response.sendStatus(409);
    conectado.release(); //libera conexion
    return;
  }

  if(usuario[0][0].id!==infoUsuario.id){//si la noticia no pertenece al usuario
    response.sendStatus(409);
    conectado.release(); //libera conexion
    return;
  }
  //si falta algun parametro recupera el anterior valor 
  if(nombre.length === 0){
    nombre = usuario[0][0].nombre;
  }
  if(email.length === 0){
    email = usuario[0][0].email;
  }
  if(bio.length === 0){
    bio = usuario[0][0].bio;
  }
  if(foto.length === 0){
    foto = usuario[0][0].foto;
  }
  if(pass.length === 0){
    pass = usuario[0][0].pass;
  }
  const hash = await bcrypt.hash(pass, 10); //encriptacion de datos
  conectado.query(
    `update usuarios 
  set nombre = "${nombre}", email = "${email}", bio = "${bio}", foto = "${foto}", pass = "${hash}"
  where id = "${id}";`);
  conectado.release();
  response.send(`Usuario "${nombre}" editado`);
};

const usuarioActual = async (request, response) => {
  const nombre = request.params.nombre; //filtro en el body
  if (!nombre) {
    response.sendStatus(400); //si faltan parametros Error 400
    return;
  }

  const conectado = await conexion.getConnection(); //conexion 
  const id = await conectado.query(
    `select id from usuarios where nombre="${nombre}"`);
  conectado.release();
  response.send(id[0]);
}

module.exports = {
  login,
  registrarUsuario,
  editarUsuario,
  usuarioActual,
};
