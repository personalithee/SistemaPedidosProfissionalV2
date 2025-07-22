// js/dashboard.js

// CONFIGURAÇÃO DO SUPABASE (Substitua com suas chaves do novo projeto)
const SUPABASE_URL = 'https://lwocvzymhkwvjlsarflf.supabase.co'; // Ex: https://abcdefghijklm.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3b2N2enltaGt3dmpsc2FyZmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTM1OTUsImV4cCI6MjA2ODc2OTU5NX0.ucW4LCE7bE_vKlHcGSP55By-Z5MVPCGv6vRaClr1lv4'; // Chave "anon public"

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserCompanyId = null; // Armazenará o company_id do usuário logado
let currentUserRole = null;     // Armazenará a role do usuário logado

// --- Elementos do DOM para Display de Usuário ---
const userEmailDisplay = document.getElementById('user-email-display');
const userRoleDisplay = document.getElementById('user-role-display');

// --- Funções de Autenticação e Verificação ---
async function checkAuthAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Se não houver usuário logado, redireciona para a página de login
        window.location.href = 'index.html';
    } else {
        // Se houver usuário, tenta buscar o perfil completo (incluindo company_id e role)
        await fetchUserProfile(user.id);
    }
}

async function fetchUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role, company_id')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Erro ao buscar perfil do usuário:', error.message);
        alert('Não foi possível carregar o seu perfil. Por favor, tente novamente ou entre em contato com o suporte.');
        await supabase.auth.signOut(); // Força o logout se o perfil não puder ser carregado
        window.location.href = 'index.html';
    } else if (data) {
        currentUserCompanyId = data.company_id;
        currentUserRole = data.role;
        userEmailDisplay.textContent = data.email;
        userRoleDisplay.textContent = data.role;

        console.log(`Usuário logado: ${data.email}, Role: ${currentUserRole}, Company ID: ${currentUserCompanyId}`);

        // Carrega os dados dependendo da role e company_id
        loadClientes();
        loadServicos();
        loadPedidos();
        loadClientesForPedidoSelect();

        // Mostra/Oculta seções de admin
        if (currentUserRole === 'admin') {
            document.querySelectorAll('.admin-feature').forEach(btn => btn.style.display = 'block');
            showSection(clientesSection); // Por padrão, mostra clientes para admin também
            loadCompanies(); // Carrega empresas para o admin
            loadUsers();     // Carrega usuários para o admin
            loadCompaniesForUserSelect(); // Carrega empresas para o select de criação de usuário
        } else {
            document.querySelectorAll('.admin-feature').forEach(btn => btn.style.display = 'none');
            showSection(clientesSection); // Usuário comum sempre começa na seção de clientes
        }
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Erro ao fazer logout:', error.message);
        alert('Erro ao sair: ' + error.message);
    } else {
        window.location.href = 'index.html'; // Redireciona para a página de login
    }
}

// --- Funções para Gerenciar a Interface das Seções ---
const clientesSection = document.getElementById('clientes-section');
const servicosSection = document.getElementById('servicos-section');
const pedidosSection = document.getElementById('pedidos-section');
const companiesSection = document.getElementById('companies-section'); // Nova seção
const usersSection = document.getElementById('users-section');       // Nova seção

function showSection(sectionToShow) {
    clientesSection.style.display = 'none';
    servicosSection.style.display = 'none';
    pedidosSection.style.display = 'none';
    companiesSection.style.display = 'none';
    usersSection.style.display = 'none';
    sectionToShow.style.display = 'block';
}

document.getElementById('show-clientes').addEventListener('click', () => showSection(clientesSection));
document.getElementById('show-servicos').addEventListener('click', () => showSection(servicosSection));
document.getElementById('show-pedidos').addEventListener('click', () => {
    showSection(pedidosSection);
    loadClientesForPedidoSelect(); // Recarrega clientes para o select ao abrir a aba
});
document.getElementById('show-companies').addEventListener('click', () => { // Novo listener
    showSection(companiesSection);
    loadCompanies();
});
document.getElementById('show-users').addEventListener('click', () => {     // Novo listener
    showSection(usersSection);
    loadUsers();
    loadCompaniesForUserSelect(); // Recarrega empresas para o select de usuário
});


// --- Funções CRUD (Clientes como Exemplo) ---

// Carregar Clientes
async function loadClientes() {
    if (!currentUserCompanyId && currentUserRole !== 'admin') {
        console.warn('company_id ou role de admin não disponível para carregar clientes.');
        return;
    }
    // Admin pode ver todos, usuários comuns só os da sua empresa
    const query = supabase.from('clientes').select('*');
    if (currentUserRole !== 'admin') {
        query.eq('company_id', currentUserCompanyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Erro ao carregar clientes:', error.message);
        alert('Erro ao carregar clientes: ' + error.message);
    } else {
        const clientesList = document.getElementById('clientes-list');
        clientesList.innerHTML = ''; // Limpa a lista existente
        if (data.length === 0) {
            clientesList.innerHTML = '<p>Nenhum cliente cadastrado ainda.</p>';
            return;
        }
        data.forEach(cliente => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>${cliente.nome}</strong> (${cliente.email || 'N/A'}) <br>
                    Tel: ${cliente.telefone || 'N/A'} - End: ${cliente.endereco || 'N/A'} <br>
                    CNPJ/CPF: ${cliente.cnpj_cpf || 'N/A'} - Resp: ${cliente.responsavel || 'N/A'}
                </span>
                <div>
                    <button data-id="${cliente.id}" class="edit-cliente-btn">Editar</button>
                    <button data-id="${cliente.id}" class="delete-btn">Excluir</button>
                </div>
            `;
            clientesList.appendChild(li);
        });
        addClienteActionListeners(); // Adiciona listeners para os botões de ação
    }
}

// Adicionar/Editar Cliente
document.getElementById('cliente-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserCompanyId && currentUserRole !== 'admin') {
        alert('Erro: ID da empresa ou role de admin não disponível. Tente recarregar a página.');
        return;
    }

    const nome = document.getElementById('cliente-nome').value;
    const email = document.getElementById('cliente-email').value;
    const telefone = document.getElementById('cliente-telefone').value;
    const endereco = document.getElementById('cliente-endereco').value;
    const cnpj_cpf = document.getElementById('cliente-cnpj-cpf').value;
    const responsavel = document.getElementById('cliente-responsavel').value;

    const currentClienteId = e.target.dataset.editingId; // Pega o ID se estiver editando

    let dbOperation;
    if (currentClienteId) {
        // Operação de UPDATE
        dbOperation = supabase
            .from('clientes')
            .update({ nome, email, telefone, endereco, cnpj_cpf, responsavel })
            .eq('id', currentClienteId)
            .eq('company_id', currentUserCompanyId); // Garante que só edite da sua empresa/admin
    } else {
        // Operação de INSERT
        dbOperation = supabase
            .from('clientes')
            .insert([
                {
                    nome, email, telefone, endereco, cnpj_cpf, responsavel,
                    company_id: currentUserCompanyId // Essencial para o RLS
                }
            ]);
    }

    const { error } = await dbOperation;

    if (error) {
        console.error('Erro ao salvar cliente:', error.message);
        alert('Erro ao salvar cliente: ' + error.message);
    } else {
        alert(currentClienteId ? 'Cliente atualizado com sucesso!' : 'Cliente adicionado com sucesso!');
        document.getElementById('cliente-form').reset(); // Limpa o formulário
        delete e.target.dataset.editingId; // Remove o ID de edição
        e.target.querySelector('button[type="submit"]').textContent = 'Adicionar Cliente'; // Volta o texto do botão
        loadClientes(); // Recarrega a lista
        loadClientesForPedidoSelect(); // Atualiza o select de clientes para pedidos
    }
});

// Preencher formulário para edição
async function editCliente(id) {
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('company_id', currentUserCompanyId) // Garante que só edite da sua empresa/admin
        .single();

    if (error) {
        console.error('Erro ao buscar cliente para edição:', error.message);
        alert('Erro ao carregar dados do cliente para edição.');
    } else if (data) {
        document.getElementById('cliente-nome').value = data.nome;
        document.getElementById('cliente-email').value = data.email;
        document.getElementById('cliente-telefone').value = data.telefone;
        document.getElementById('cliente-endereco').value = data.endereco;
        document.getElementById('cliente-cnpj-cpf').value = data.cnpj_cpf;
        document.getElementById('cliente-responsavel').value = data.responsavel;
        document.getElementById('cliente-form').dataset.editingId = data.id; // Armazena o ID para update
        document.getElementById('cliente-form').querySelector('button[type="submit"]').textContent = 'Atualizar Cliente';
    }
}

// Excluir Cliente
async function deleteCliente(id) {
    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('company_id', currentUserCompanyId); // Garante que só exclua da sua empresa/admin

    if (error) {
        console.error('Erro ao excluir cliente:', error.message);
        alert('Erro ao excluir cliente: ' + error.message);
    } else {
        alert('Cliente excluído com sucesso!');
        loadClientes(); // Recarrega a lista
        loadClientesForPedidoSelect();
    }
}

function addClienteActionListeners() {
    document.querySelectorAll('#clientes-list .delete-btn').forEach(button => {
        button.onclick = () => {
            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                deleteCliente(button.dataset.id);
            }
        };
    });
    document.querySelectorAll('#clientes-list .edit-cliente-btn').forEach(button => {
        button.onclick = () => editCliente(button.dataset.id);
    });
}

// --- Funções CRUD para Serviços ---
async function loadServicos() {
    if (!currentUserCompanyId && currentUserRole !== 'admin') return;
    const query = supabase.from('servicos').select('*');
    if (currentUserRole !== 'admin') {
        query.eq('company_id', currentUserCompanyId);
    }
    const { data, error } = await query;

    if (error) {
        console.error('Erro ao carregar serviços:', error.message);
        alert('Erro ao carregar serviços: ' + error.message);
    } else {
        const servicosList = document.getElementById('servicos-list');
        servicosList.innerHTML = '';
        if (data.length === 0) {
            servicosList.innerHTML = '<p>Nenhum serviço cadastrado ainda.</p>';
            return;
        }
        data.forEach(servico => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>${servico.nome}</strong> (R$ ${servico.preco.toFixed(2)})<br>
                    Descrição: ${servico.descricao || 'N/A'}
                </span>
                <div>
                    <button data-id="${servico.id}" class="edit-servico-btn">Editar</button>
                    <button data-id="${servico.id}" class="delete-servico-btn">Excluir</button>
                </div>
            `;
            servicosList.appendChild(li);
        });
        addServicoActionListeners();
    }
}

document.getElementById('servico-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserCompanyId && currentUserRole !== 'admin') return;

    const nome = document.getElementById('servico-nome').value;
    const descricao = document.getElementById('servico-descricao').value;
    const preco = parseFloat(document.getElementById('servico-preco').value);

    const currentServicoId = e.target.dataset.editingId;

    let dbOperation;
    if (currentServicoId) {
        dbOperation = supabase
            .from('servicos')
            .update({ nome, descricao, preco })
            .eq('id', currentServicoId)
            .eq('company_id', currentUserCompanyId);
    } else {
        dbOperation = supabase
            .from('servicos')
            .insert([
                {
                    nome, descricao, preco,
                    company_id: currentUserCompanyId
                }
            ]);
    }

    const { error } = await dbOperation;

    if (error) {
        console.error('Erro ao salvar serviço:', error.message);
        alert('Erro ao salvar serviço: ' + error.message);
    } else {
        alert(currentServicoId ? 'Serviço atualizado com sucesso!' : 'Serviço adicionado com sucesso!');
        document.getElementById('servico-form').reset();
        delete e.target.dataset.editingId;
        e.target.querySelector('button[type="submit"]').textContent = 'Adicionar Serviço';
        loadServicos();
    }
});

async function editServico(id) {
    const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('id', id)
        .eq('company_id', currentUserCompanyId)
        .single();

    if (error) {
        console.error('Erro ao buscar serviço para edição:', error.message);
        alert('Erro ao carregar dados do serviço para edição.');
    } else if (data) {
        document.getElementById('servico-nome').value = data.nome;
        document.getElementById('servico-descricao').value = data.descricao;
        document.getElementById('servico-preco').value = data.preco;
        document.getElementById('servico-form').dataset.editingId = data.id;
        document.getElementById('servico-form').querySelector('button[type="submit"]').textContent = 'Atualizar Serviço';
    }
}

async function deleteServico(id) {
    const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id)
        .eq('company_id', currentUserCompanyId);

    if (error) {
        console.error('Erro ao excluir serviço:', error.message);
        alert('Erro ao excluir serviço: ' + error.message);
    } else {
        alert('Serviço excluído com sucesso!');
        loadServicos();
    }
}

function addServicoActionListeners() {
    document.querySelectorAll('#servicos-list .delete-servico-btn').forEach(button => {
        button.onclick = () => {
            if (confirm('Tem certeza que deseja excluir este serviço?')) {
                deleteServico(button.dataset.id);
            }
        };
    });
    document.querySelectorAll('#servicos-list .edit-servico-btn').forEach(button => {
        button.onclick = () => editServico(button.dataset.id);
    });
}


// --- Funções CRUD para Pedidos ---
async function loadClientesForPedidoSelect() {
    if (!currentUserCompanyId && currentUserRole !== 'admin') return;
    const query = supabase.from('clientes').select('id, nome');
    if (currentUserRole !== 'admin') {
        query.eq('company_id', currentUserCompanyId);
    }
    const { data, error } = await query;

    if (error) {
        console.error('Erro ao carregar clientes para o select:', error.message);
    } else {
        const selectElement = document.getElementById('pedido-cliente-select');
        selectElement.innerHTML = '<option value="">Selecione um Cliente</option>'; // Limpa e adiciona opção padrão
        data.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            selectElement.appendChild(option);
        });
    }
}

async function loadPedidos() {
    if (!currentUserCompanyId && currentUserRole !== 'admin') return;
    const query = supabase.from('pedidos').select('*, clientes(nome)'); // Seleciona dados do pedido e o nome do cliente relacionado
    if (currentUserRole !== 'admin') {
        query.eq('company_id', currentUserCompanyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false }); // Ordena pelos mais recentes

    if (error) {
        console.error('Erro ao carregar pedidos:', error.message);
        alert('Erro ao carregar pedidos: ' + error.message);
    } else {
        const pedidosList = document.getElementById('pedidos-list');
        pedidosList.innerHTML = '';
        if (data.length === 0) {
            pedidosList.innerHTML = '<p>Nenhum pedido cadastrado ainda.</p>';
            return;
        }
        data.forEach(pedido => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>Pedido #${pedido.id.substring(0, 8)}</strong> - Cliente: ${pedido.clientes ? pedido.clientes.nome : 'N/A'} <br>
                    Status: ${pedido.status} - Valor: R$ ${pedido.valor_total.toFixed(2)} <br>
                    Data: ${new Date(pedido.data_pedido).toLocaleDateString()}
                </span>
                <div>
                    <button data-id="${pedido.id}" class="edit-pedido-btn">Editar</button>
                    <button data-id="${pedido.id}" class="delete-pedido-btn">Excluir</button>
                </div>
            `;
            pedidosList.appendChild(li);
        });
        addPedidoActionListeners();
    }
}

document.getElementById('pedido-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserCompanyId && currentUserRole !== 'admin') return;

    const clienteId = document.getElementById('pedido-cliente-select').value;
    const valorTotal = parseFloat(document.getElementById('pedido-valor-total').value);

    if (!clienteId) {
        alert('Por favor, selecione um cliente.');
        return;
    }

    const currentPedidoId = e.target.dataset.editingId;

    let dbOperation;
    if (currentPedidoId) {
        dbOperation = supabase
            .from('pedidos')
            .update({ cliente_id: clienteId, valor_total: valorTotal }) // Status e data podem ser atualizados aqui também
            .eq('id', currentPedidoId)
            .eq('company_id', currentUserCompanyId);
    } else {
        dbOperation = supabase
            .from('pedidos')
            .insert([
                {
                    cliente_id: clienteId,
                    valor_total: valorTotal,
                    company_id: currentUserCompanyId
                }
            ]);
    }

    const { error } = await dbOperation;

    if (error) {
        console.error('Erro ao salvar pedido:', error.message);
        alert('Erro ao salvar pedido: ' + error.message);
    } else {
        alert(currentPedidoId ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!');
        document.getElementById('pedido-form').reset();
        delete e.target.dataset.editingId;
        e.target.querySelector('button[type="submit"]').textContent = 'Criar Pedido';
        loadPedidos();
    }
});

async function editPedido(id) {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', id)
        .eq('company_id', currentUserCompanyId)
        .single();

    if (error) {
        console.error('Erro ao buscar pedido para edição:', error.message);
        alert('Erro ao carregar dados do pedido para edição.');
    } else if (data) {
        document.getElementById('pedido-cliente-select').value = data.cliente_id;
        document.getElementById('pedido-valor-total').value = data.valor_total;
        document.getElementById('pedido-form').dataset.editingId = data.id;
        document.getElementById('pedido-form').querySelector('button[type="submit"]').textContent = 'Atualizar Pedido';
    }
}

async function deletePedido(id) {
    const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id)
        .eq('company_id', currentUserCompanyId);

    if (error) {
        console.error('Erro ao excluir pedido:', error.message);
        alert('Erro ao excluir pedido: ' + error.message);
    } else {
        alert('Pedido excluído com sucesso!');
        loadPedidos();
    }
}

function addPedidoActionListeners() {
    document.querySelectorAll('#pedidos-list .delete-pedido-btn').forEach(button => {
        button.onclick = () => {
            if (confirm('Tem certeza que deseja excluir este pedido?')) {
                deletePedido(button.dataset.id);
            }
        };
    });
    document.querySelectorAll('#pedidos-list .edit-pedido-btn').forEach(button => {
        button.onclick = () => editPedido(button.dataset.id);
    });
}

// --- Funções CRUD para Gerenciamento de Empresas (APENAS ADMIN) ---
async function loadCompanies() {
    if (currentUserRole !== 'admin') return; // Apenas admin pode ver
    const { data, error } = await supabase
        .from('companies')
        .select('*');

    if (error) {
        console.error('Erro ao carregar empresas:', error.message);
        alert('Erro ao carregar empresas: ' + error.message);
    } else {
        const companiesList = document.getElementById('companies-list');
        companiesList.innerHTML = '';
        if (data.length === 0) {
            companiesList.innerHTML = '<p>Nenhuma empresa cadastrada ainda.</p>';
            return;
        }
        data.forEach(company => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>${company.name}</strong> (ID: ${company.id.substring(0, 8)}...)
                </span>
                <div>
                    <button data-id="${company.id}" class="edit-company-btn">Editar</button>
                    <button data-id="${company.id}" class="delete-company-btn">Excluir</button>
                </div>
            `;
            companiesList.appendChild(li);
        });
        addCompanyActionListeners();
        loadCompaniesForUserSelect(); // Atualiza o select de empresas para criação de usuário
    }
}

document.getElementById('company-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') { alert('Permissão negada.'); return; }

    const companyName = document.getElementById('company-name').value;
    const currentCompanyId = e.target.dataset.editingId;

    let dbOperation;
    if (currentCompanyId) {
        dbOperation = supabase
            .from('companies')
            .update({ name: companyName })
            .eq('id', currentCompanyId);
    } else {
        // Chama a função RPC para criar nova empresa
        dbOperation = supabase.rpc('create_new_company', { company_name: companyName });
    }

    const { error } = await dbOperation;

    if (error) {
        console.error('Erro ao salvar empresa:', error.message);
        alert('Erro ao salvar empresa: ' + error.message);
    } else {
        alert(currentCompanyId ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!');
        document.getElementById('company-form').reset();
        delete e.target.dataset.editingId;
        e.target.querySelector('button[type="submit"]').textContent = 'Criar Empresa';
        loadCompanies();
    }
});

async function editCompany(id) {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Erro ao buscar empresa para edição:', error.message);
        alert('Erro ao carregar dados da empresa para edição.');
    } else if (data) {
        document.getElementById('company-name').value = data.name;
        document.getElementById('company-form').dataset.editingId = data.id;
        document.getElementById('company-form').querySelector('button[type="submit"]').textContent = 'Atualizar Empresa';
    }
}

async function deleteCompany(id) {
    if (!confirm('Tem certeza que deseja EXCLUIR esta empresa e TODOS os seus dados (perfis, clientes, serviços, pedidos)? Esta ação é irreversível!')) {
        return;
    }
    const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao excluir empresa:', error.message);
        alert('Erro ao excluir empresa: ' + error.message);
    } else {
        alert('Empresa excluída com sucesso!');
        loadCompanies();
    }
}

function addCompanyActionListeners() {
    document.querySelectorAll('#companies-list .delete-company-btn').forEach(button => {
        button.onclick = () => deleteCompany(button.dataset.id);
    });
    document.querySelectorAll('#companies-list .edit-company-btn').forEach(button => {
        button.onclick = () => editCompany(button.dataset.id);
    });
}

// --- Funções CRUD para Gerenciamento de Usuários (APENAS ADMIN) ---
async function loadCompaniesForUserSelect() {
    if (currentUserRole !== 'admin') return;
    const { data, error } = await supabase
        .from('companies')
        .select('id, name');

    if (error) {
        console.error('Erro ao carregar empresas para o select de usuário:', error.message);
    } else {
        const selectElement = document.getElementById('new-user-company-select');
        selectElement.innerHTML = '<option value="">Selecione a Empresa</option>';
        data.forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            selectElement.appendChild(option);
        });
    }
}

async function loadUsers() {
    if (currentUserRole !== 'admin') return; // Apenas admin pode ver
    // Admins podem ver todos os usuários e seus perfis
    const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(name)'); // Seleciona dados do perfil e o nome da empresa relacionada

    if (error) {
        console.error('Erro ao carregar usuários:', error.message);
        alert('Erro ao carregar usuários: ' + error.message);
    } else {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        if (data.length === 0) {
            usersList.innerHTML = '<p>Nenhum usuário cadastrado ainda.</p>';
            return;
        }
        data.forEach(profile => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>${profile.email}</strong> (${profile.full_name || 'N/A'}) <br>
                    Role: ${profile.role} | Empresa: ${profile.companies ? profile.companies.name : 'N/A'}
                </span>
                <div>
                    <button data-id="${profile.id}" data-email="${profile.email}" data-role="${profile.role}" data-company-id="${profile.company_id}" data-full-name="${profile.full_name || ''}" class="edit-user-btn">Editar</button>
                    <button data-id="${profile.id}" class="delete-user-btn">Excluir</button>
                </div>
            `;
            usersList.appendChild(li);
        });
        addUserActionListeners();
    }
}

document.getElementById('user-creation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') { alert('Permissão negada.'); return; }

    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const fullName = document.getElementById('new-user-full-name').value;
    const role = document.getElementById('new-user-role').value;
    const companyId = document.getElementById('new-user-company-select').value;

    if (!companyId) {
        alert('Por favor, selecione uma empresa para o novo usuário.');
        return;
    }

    const currentUserId = e.target.dataset.editingId;

    let authOperation;
    if (currentUserId) {
        // ADMIN: Atualiza usuário existente via Auth Admin API
        // A senha só é atualizada se for fornecida
        const updateData = { email: email };
        if (password) {
            updateData.password = password;
        }
        authOperation = supabase.auth.admin.updateUserById(currentUserId, updateData);
    } else {
        // ADMIN: Cria novo usuário via Auth Admin API
        authOperation = supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Confirma automaticamente o e-mail para usuários criados pelo admin
        });
    }

    const { data: authData, error: authError } = await authOperation;

    if (authError) {
        console.error('Erro na operação de autenticação (criar/atualizar usuário):', authError.message);
        alert('Erro ao criar/atualizar usuário: ' + authError.message);
        return;
    }

    const userId = currentUserId || authData.user.id; // Pega o ID do usuário criado ou o ID do usuário que está sendo editado

    // Agora, cria ou atualiza o perfil (public.profiles) via RPC
    const { error: rpcError } = await supabase.rpc('create_profile_for_user', {
        user_id: userId,
        user_email: email,
        user_role: role,
        user_company_id: companyId,
        full_name: fullName // Passa o full_name para a função RPC
    });

    if (rpcError) {
        console.error('Erro ao criar/atualizar perfil via RPC:', rpcError.message);
        alert('Erro ao criar/atualizar perfil do usuário: ' + rpcError.message);
        // Se o perfil falhar, você pode querer deletar o usuário recém-criado em auth.users para evitar inconsistência
        if (!currentUserId) { // Se foi uma criação, tenta reverter
             await supabase.auth.admin.deleteUser(userId);
             console.log('Usuário auth.users revertido devido a falha no perfil.');
        }
    } else {
        alert(currentUserId ? 'Usuário e perfil atualizados com sucesso!' : 'Usuário e perfil criados com sucesso!');
        document.getElementById('user-creation-form').reset();
        delete e.target.dataset.editingId;
        e.target.querySelector('button[type="submit"]').textContent = 'Criar Usuário';
        loadUsers(); // Recarrega a lista de usuários
    }
});

async function editUser(id, email, role, companyId, fullName) {
    document.getElementById('new-user-email').value = email;
    // Senha não pode ser preenchida por segurança, o admin terá que redefinir se necessário
    document.getElementById('new-user-full-name').value = fullName;
    document.getElementById('new-user-role').value = role;
    document.getElementById('new-user-company-select').value = companyId;
    document.getElementById('user-creation-form').dataset.editingId = id;
    document.getElementById('user-creation-form').querySelector('button[type="submit"]').textContent = 'Atualizar Usuário';
}

async function deleteUser(id) {
    if (!confirm('Tem certeza que deseja EXCLUIR este usuário? Isso removerá o acesso e o perfil dele. Esta ação é irreversível!')) {
        return;
    }
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
        console.error('Erro ao excluir usuário:', error.message);
        alert('Erro ao excluir usuário: ' + error.message);
    } else {
        alert('Usuário excluído com sucesso!');
        loadUsers(); // Recarrega a lista
    }
}

function addUserActionListeners() {
    document.querySelectorAll('#users-list .delete-user-btn').forEach(button => {
        button.onclick = () => deleteUser(button.dataset.id);
    });
    document.querySelectorAll('#users-list .edit-user-btn').forEach(button => {
        button.onclick = () => editUser(
            button.dataset.id,
            button.dataset.email,
            button.dataset.role,
            button.dataset.companyId,
            button.dataset.fullName
        );
    });
}


// --- Inicialização ---
document.getElementById('logout-button').addEventListener('click', handleLogout);

// Chama a função de verificação de autenticação ao carregar a página
checkAuthAndRedirect();

// Listener para o evento de autenticação do Supabase
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        // Se a sessão for válida (recarregou ou login persistente)
        fetchUserProfile(session.user.id);
    } else if (event === 'SIGNED_OUT') {
        // Se deslogou, redireciona
        window.location.href = 'index.html';
    }
});
