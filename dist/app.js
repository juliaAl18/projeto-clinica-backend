"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors = require('cors');
const mysql_1 = __importDefault(require("mysql"));
const passport = require('passport');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { format } = require('date-fns');
const dotenv = require('dotenv');
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(cors());
app.use(passport.initialize());
const db = mysql_1.default.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Conectado ao banco de dados MySQL');
});
// ROTAS USUARIO 
app.post('/api/usuario', (req, res) => {
    const { nome, email, senha } = req.body;
    db.query('SELECT * FROM usuario WHERE email = ?', [email], (err, results) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(500).send('Erro interno do servidor');
        }
        if (results.length > 0) {
            return res.status(400).send('Este e-mail já está em uso');
        }
        try {
            const hashedPassword = yield bcrypt_1.default.hash(senha, 10);
            db.query('INSERT INTO usuario (nome, email, senha) VALUES (?, ?, ?)', [nome, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Erro ao cadastrar usuário:', err);
                    return res.status(500).send('Erro interno do servidor');
                }
                res.status(201).send('Usuário cadastrado com sucesso');
            });
        }
        catch (error) {
            res.status(500).send('Erro interno do servidor');
        }
    }));
});
app.get('/api/usuario', (req, res) => {
    const query = 'SELECT * FROM usuario';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).send('Erro ao buscar usuários');
            return;
        }
        res.json(results);
    });
});
// ROTA LOGIN
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    const query = 'SELECT * FROM usuario WHERE email = ? AND senha = ?';
    db.query(query, [email, senha], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro interno do servidor');
        }
        if (results.length === 0) {
            return res.status(401).send('Credenciais inválidas');
        }
        const user = results[0];
        const isAdmin = user.nivel_acesso === 'admin';
        res.status(200).json({ isAdmin });
    });
});
// ROTAS EQUIPAMENTOS
app.get('/api/equipamentos', (req, res) => {
    const query = 'SELECT * FROM equipamentos';
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno do servidor' });
        }
        res.status(200).json(result);
    });
});
app.delete('/api/equipamentos/:id', (req, res) => {
    const equipamentoId = req.params.id;
    const query = 'DELETE FROM equipamentos WHERE id = ?';
    db.query(query, [equipamentoId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno do servidor' });
        }
        res.status(200).json({ message: 'Equipamento excluído com sucesso' });
    });
});
app.put('/api/equipamentos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, tipo, marca, modelo, anoFabricacao, disponivel } = req.body;
    const query = `UPDATE equipamentos SET nome=?, 
  tipo=?, marca=?, modelo=?, anoFabricacao=?, 
  disponivel=? WHERE id=?`;
    const values = [nome, tipo, marca, modelo, anoFabricacao, disponivel, id];
    db.query(query, values, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao editar equipamento' });
            return;
        }
        res.status(200).json({ message: 'Equipamento editado com sucesso' });
    });
});
app.get('/api/equipamentos/:id', (req, res) => {
    const equipamentoId = req.params.id;
    const query = `SELECT * FROM equipamentos WHERE id = ?`;
    db.query(query, [equipamentoId], (error, results, fields) => {
        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar informações do equipamento' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Equipamento não encontrado' });
        }
        res.status(200).json(results[0]);
    });
});
app.post('/api/equipamentos', (req, res) => {
    const { nome, tipo, marca, modelo, ano_fabricacao, disponivel } = req.body;
    const query = 'INSERT INTO equipamentos (nome, tipo, marca, modelo, anoFabricacao, disponivel) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [nome, tipo, marca, modelo, ano_fabricacao, disponivel];
    db.query(query, values, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao cadastrar equipamento' });
        }
        else {
            res.status(201).json({ message: 'Equipamento cadastrado com sucesso' });
        }
    });
});
// ROTA PAGAMENTO
app.post('/api/cadastrar-pagamento', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data_pagamento, valor, metodo_pagamento, idDentista, idPaciente } = req.body;
        if (!data_pagamento || !valor || !metodo_pagamento || !idDentista || !idPaciente) {
            return res.status(400).json({ error: 'Dados do pagamento incompletos.' });
        }
        const query = `
      INSERT INTO pagamento (data_pagamento, valor, metodo_pagamento, idDentista, idPaciente)
      VALUES (?, ?, ?, ?, ?)
    `;
        const values = [data_pagamento, valor, metodo_pagamento, idDentista, idPaciente];
        yield db.query(query, values);
        res.status(201).json({ message: 'Pagamento cadastrado com sucesso.' });
    }
    catch (error) {
        console.error('Erro ao cadastrar pagamento:', error);
        res.status(500).json({ error: 'Erro interno ao cadastrar pagamento.' });
    }
}));
app.get('/api/pagamentos/pacienteIdPorNome', (req, res) => {
    const nome = req.query.nome;
    const query = 'SELECT id FROM paciente WHERE nome = ?';
    db.query(query, [nome], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao consultar o banco de dados' });
            return;
        }
        if (results.length > 0) {
            const idPaciente = results[0].id;
            res.json({ idPaciente });
        }
        else {
            res.status(404).json({ error: 'Paciente não encontrado' });
        }
    });
});
app.get('/api/pagamentos/dentistaIdPorNome', (req, res) => {
    const nome = req.query.nome;
    db.query('SELECT id FROM dentista WHERE nome = ?', [nome], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao consultar o banco de dados' });
            return;
        }
        if (results.length > 0) {
            const idDentista = results[0].id;
            res.json({ idDentista });
        }
        else {
            res.status(404).json({ error: 'Dentista não encontrado' });
        }
    });
});
// ROTA DENTISTA
app.post('/api/dentistas', (req, res) => {
    const { cpf, nome, especialidade, email, dataNascimento, telefone, endereco, cidade, estado, cep } = req.body;
    const nivel_acesso = 'admin';
    const query = `INSERT INTO dentista (cpf, nome, especialidade, email,dataNascimento, telefone, endereco, cidade, estado, nivel_acesso, cep) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [cpf, nome, especialidade, email, dataNascimento, telefone, endereco, cidade, estado, nivel_acesso, cep];
    db.query(query, values, (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Erro interno ao inserir dentista' });
        }
        else {
            res.status(201).json({ message: 'Dentista inserido com sucesso', dentista: results.insertId });
        }
    });
});
app.get('/api/dentistas-filtro', (req, res) => {
    const { nome } = req.query;
    const query = `SELECT * FROM dentista WHERE nome LIKE '%${nome}%'`;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao consultar o banco de dados' });
            return;
        }
        res.json(results);
    });
});
app.delete('/api/dentistas/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM dentista WHERE id = ?';
    db.query(query, id, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao deletar o dentista' });
        }
        else {
            res.status(200).json({ message: 'Dentista deletado com sucesso' });
        }
    });
});
app.put('/api/dentistas/:id', (req, res) => {
    const dentistaId = req.params.id;
    const { cpf, nome, especialidade, email, telefone, endereco, cidade, estado } = req.body;
    const query = `
    UPDATE dentista
    SET cpf = '${cpf}', nome = '${nome}', especialidade = '${especialidade}',
    email = '${email}', telefone = '${telefone}', endereco = '${endereco}',
    cidade = '${cidade}', estado = '${estado}'
    WHERE id = ${dentistaId}`;
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Erro ao editar dentista' });
        }
        else {
            res.status(200).json({ message: 'Dentista editado com sucesso' });
        }
    });
});
app.get('/api/dentistas', (req, res) => {
    const query = 'SELECT * FROM dentista';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Erro ao buscar dentistas');
        }
        res.status(200).json(results);
    });
});
app.get('/api/dentistas/:id', (req, res) => {
    const id = req.params.id;
    const query = `SELECT * FROM dentista WHERE id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao buscar dentista' });
        }
        else if (results.length === 0) {
            res.status(404).json({ error: 'Dentista não encontrado' });
        }
        else {
            res.json(results[0]);
        }
    });
});
// ROTA PACIENTE
app.get('/api/pacientes', (req, res) => {
    const query = 'SELECT * FROM paciente';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Erro ao buscar pacientes');
        }
        res.status(200).json(results);
    });
});
app.post('/api/pacientes', (req, res) => {
    const paciente = req.body;
    db.query('INSERT INTO paciente (nome, cpf, dataNascimento, genero, email, telefone, endereco, cidade, estado, cep) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        paciente.nome,
        paciente.cpf,
        paciente.dataNascimento,
        paciente.genero,
        paciente.email,
        paciente.telefone,
        paciente.endereco,
        paciente.cidade,
        paciente.estado,
        paciente.cep
    ], (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Erro ao cadastrar paciente' });
        }
        else {
            sendConfirmationEmail(paciente);
            res.status(200).json({ message: 'Paciente cadastrado com sucesso!' });
        }
    });
});
app.get('/api/pacientes', (req, res) => {
    const query = 'SELECT * FROM paciente';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao buscar pacientes' });
        }
        else {
            res.json(results);
        }
    });
});
app.get('/api/pacientes-filtro', (req, res) => {
    const { nome } = req.query;
    const query = `SELECT * FROM paciente WHERE nome LIKE '%${nome}%'`;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao consultar o banco de dados' });
            return;
        }
        res.json(results);
    });
});
app.get('/api/pacientes/:id', (req, res) => {
    const id = req.params.id;
    const query = `SELECT * FROM paciente WHERE id = ?`;
    db.query(query, id, (error, results) => {
        if (error)
            throw error;
        res.json(results[0]);
    });
});
app.put('/api/pacientes/:id', (req, res) => {
    const pacienteId = req.params.id;
    const { nome, cpf, dataNascimento, genero, email, telefone, endereco, cidade, estado, cep } = req.body;
    const query = `
    UPDATE paciente
    SET nome = '${nome}', cpf = '${cpf}', dataNascimento = '${dataNascimento}',
    genero = '${genero}', email = '${email}', telefone = '${telefone}',
    endereco = '${endereco}', cidade = '${cidade}', estado = '${estado}',
    cep = '${cep}'
    WHERE id = ${pacienteId}`;
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Erro ao editar paciente' });
        }
        else {
            res.status(200).json({ message: 'Paciente editado com sucesso' });
        }
    });
});
app.delete('/api/pacientes/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM paciente WHERE id = ?';
    db.query(query, id, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao deletar o dentista' });
        }
        else {
            res.status(200).json({ message: 'Dentista deletado com sucesso' });
        }
    });
});
// ROTA FATURAMENTO
app.get('/api/faturamento-mensal', (req, res) => {
    const query = `
    SELECT 
    MONTH(p.data_pagamento) AS mes,
    YEAR(p.data_pagamento) AS ano,
    SUM(p.valor) AS valor_faturado,
    GROUP_CONCAT(pa.nome SEPARATOR ', ') AS pacientes
    FROM pagamento p
    JOIN paciente pa ON p.idPaciente = pa.id
    GROUP BY YEAR(p.data_pagamento), MONTH(p.data_pagamento);
  `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao consultar o banco de dados' });
        }
        else {
            res.json(results);
        }
    });
});
// ROTA EMAIL
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
function enviarEmailsPromocionais() {
    const query = `
    SELECT usuario.email FROM usuario
    UNION
    SELECT paciente.email FROM paciente
  `;
    db.query(query, (error, results) => {
        if (error) {
            console.error('Erro ao obter e-mails:', error);
            return;
        }
        results.forEach((row) => {
            const mailOptions = {
                from: 'dentlifeclinicaodonto@gmail.com',
                to: row.email,
                subject: 'Oferta Especial para Você!',
                text: `
        Olá!
        Estamos animados em compartilhar uma oferta exclusiva com você! Por tempo limitado, aproveite nosso desconto especial:
        Desconto de 20% em todos os produtos!
        Utilize o código promocional DESCONTO20 no checkout para aproveitar esta oferta incrível.
        Corra e não perca esta oportunidade!
        Atenciosamente,DentalLife Clinica Odontologica`
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Erro ao enviar e-mail:', error);
                }
                else {
                    console.log('E-mail enviado para', row.email);
                }
            });
        });
    });
}
app.get('/api/enviar-promocao', (req, res) => {
    enviarEmailsPromocionais();
    res.send('E-mails de promoção estão sendo enviados!');
});
cron.schedule('0 8 * * *', () => {
    console.log('Agendador de e-mails ativado!');
    enviarEmailsPromocionais();
});
function sendConfirmationEmail(paciente) {
    const mailOptions = {
        from: 'dentlifeclinicaodonto@gmail.com',
        to: paciente.email,
        subject: 'Bem-vindo à DentLife Clínica Odontológica ',
        text: `Olá ${paciente.nome}, 
    
  Seja bem-vindo à DentalLife Clínica Odontológica! 
  Estamos muito felizes em tê-lo(a) como nosso(a) novo(a) paciente. Nosso compromisso é proporcionar um atendimento odontológico de alta qualidade, sempre visando o seu conforto e bem-estar.
  Estamos aqui para cuidar da sua saúde bucal com dedicação e profissionalismo.

  A equipe da Clínica DentalLife está à disposição para oferecer os melhores tratamentos odontológicos, desde prevenção até procedimentos especializados. 
  Estamos ansiosos para ajudá-lo(a) a manter um sorriso saudável e bonito.
    
  Se você tiver alguma dúvida ou precisar agendar uma consulta, não hesite em nos contatar. 
  Estamos aqui para ajudar!
    
  Mais uma vez, seja bem-vindo(a) à nossa clínica. Estamos ansiosos para cuidar da sua saúde bucal.
    
  Atenciosamente,
    
  Equipe da DentalLife`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Erro ao enviar e-mail:', error);
        }
        else {
            console.log('E-mail enviado com sucesso:', info.response);
        }
    });
}
// ROTA CONSULTA
app.post('/api/marcar-consulta', (req, res) => {
    const { nome, telefone, data, hora } = req.body;
    db.query('INSERT INTO agendamento (nome, telefone, data, hora) VALUES (?, ?, ?, ?)', [nome, telefone, data, hora], (error, results) => {
        if (error) {
            res.status(500).send('Erro ao marcar a consulta');
        }
        else {
            const dataFormatada = format(new Date(data), 'dd/MM/yyyy');
            res.status(200).json({ message: 'Consulta agendada com sucesso!' });
        }
    });
});
// ROTA AGENDAMENTOS
app.get('/api/agendamentos', (req, res) => {
    db.query('SELECT * FROM agendamento', (error, results) => {
        if (error)
            throw error;
        res.json(results);
    });
});
app.post('/api/agendamentos', (req, res) => {
    const { nome, telefone, data, hora } = req.body;
    const newAgendamento = { nome, telefone, data, hora };
    db.query('INSERT INTO agendamento SET ?', newAgendamento, (error, results) => {
        if (error)
            throw error;
        res.json({ message: 'Agendamento criado com sucesso!', id: results.insertId });
    });
});
app.get('/api/horarios-disponiveis', (req, res) => {
    const { data } = req.query;
    db.query('SELECT TIME_FORMAT(hora, "%H:%i") AS hora FROM agendamento WHERE data = ?', [data], (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Erro ao consultar horários disponíveis' });
        }
        else {
            const horariosAgendados = results.map((result) => result.hora);
            const todosHorarios = [
                '09:00', '10:00', '11:00', '12:00', '13:00',
                '14:00', '15:00', '16:00', '17:00'
            ];
            const horariosDisponiveis = todosHorarios.filter(horario => !horariosAgendados.includes(horario));
            res.status(200).json({ horariosDisponiveis });
        }
    });
});
// ROTA COMENTARIOS
app.get('/api/comentarios', (req, res) => {
    db.query('SELECT comentarios.id, comentarios.comentario, comentarios.data_publicacao, comentarios.avaliacao, usuario.nome AS nome_usuario, usuario.email AS email_usuario FROM comentarios INNER JOIN usuario ON comentarios.usuario_id = usuario.id', (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Erro ao buscar comentários' });
        }
        else {
            res.json(results);
        }
    });
});
app.listen(PORT, () => {
    console.log(`Servidor Node.js em execução na porta ${PORT}`);
});
