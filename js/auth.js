// js/auth.js

// CONFIGURAÇÃO DO SUPABASE (Substitua com suas chaves do novo projeto)
const SUPABASE_URL = 'https://lwocvzymhkwvjlsarflf.supabase.co'; // Ex: https://abcdefghijklm.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3b2N2enltaGt3dmpsc2FyZmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTM1OTUsImV4cCI6MjA2ODc2OTU5NX0.ucW4LCE7bE_vKlHcGSP55By-Z5MVPCGv6vRaClr1lv4'; // Chave "anon public"

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos do DOM
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');

// Listener do Formulário de Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Erro no login:', error.message);
        alert('Erro no login: ' + error.message);
    } else if (data.user) {
        console.log('Login bem-sucedido:', data.user);

        // *** IMPORTANTE: Garante que o perfil do usuário seja criado/atualizado no primeiro login ***
        // Esta chamada RPC criará o perfil na tabela public.profiles.
        // Se o usuário for o primeiro admin, a role e company_id serão definidos manualmente no Supabase APÓS este primeiro login.
        // Para usuários criados pelo admin, a role e company_id virão da criação.
        const { error: rpcError } = await supabase.rpc('create_profile_for_user', {
            user_id: data.user.id,
            user_email: data.user.email,
            user_role: 'user', // Role padrão inicial, pode ser atualizada para 'admin' ou outra
            user_company_id: null // Será tratado na função RPC para o primeiro admin, ou virá da criação do admin
        });

        if (rpcError) {
            console.error('Erro ao garantir perfil via RPC no login:', rpcError.message);
            alert('Erro ao configurar seu perfil. Por favor, tente fazer login novamente.');
            await supabase.auth.signOut(); // Força o logout se o perfil não puder ser criado
            window.location.href = 'index.html';
        } else {
            console.log('Perfil do usuário verificado/criado via RPC no login.');
            alert('Login bem-sucedido!');
            window.location.href = 'dashboard.html'; // Redireciona para o dashboard
        }
    }
});

// Verifica o status de autenticação ao carregar a página
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, 'Session:', session);
    if (event === 'SIGNED_IN' && session) {
        // Se já estiver logado, redireciona para o dashboard
        window.location.href = 'dashboard.html';
    }
});
