import React, { useState } from 'react';
import { Button, Input, Message, Tabs } from '@arco-design/web-react';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TabPane = Tabs.TabPane;

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      Message.warning('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    const res = await login({ username: username.trim(), password, remember: true });
    setLoading(false);
    if (res.success) {
      Message.success('Connexion réussie');
      void navigate('/guid');
    } else {
      Message.error(res.message || 'Identifiants invalides');
    }
  };

  const handleSignUp = async () => {
    if (!username.trim() || !password || !confirmPassword) {
      Message.warning('Veuillez remplir tous les champs');
      return;
    }
    if (password !== confirmPassword) {
      Message.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      Message.warning('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    const res = await register({ username: username.trim(), password });
    setLoading(false);
    if (res.success) {
      Message.success('Compte créé et connecté avec succès');
      void navigate('/guid');
    } else {
      Message.error(res.message || "Erreur lors de l'inscription");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (activeTab === 'signin') {
        void handleSignIn();
      } else {
        void handleSignUp();
      }
    }
  };

  const fillDemoAccount = () => {
    setActiveTab('signin');
    setUsername('ohada.save@gmail.com');
    setPassword('LEADER00');
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-gray-950 p-4'>
      <div className='w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8'>
        <div className='text-center mb-6'>
          <img src='/logo_projet/android-chrome-512x512.png' alt='E-audit' className='w-20 h-20 mx-auto mb-3 object-contain rounded-xl' />
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white tracking-tight'>E-audit</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Automatisez vos activités, d&apos;audit, risque et contrôle</p>
        </div>

        <Tabs activeTab={activeTab} onChange={setActiveTab} type='rounded' className='mb-2'>
          <TabPane key='signin' title='Se connecter'>
            <div className='space-y-4 mt-4' onKeyDown={handleKeyDown}>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5'>Nom d&apos;utilisateur ou email</label>
                <Input size='large' prefix={<User className='w-4 h-4 text-gray-400' />} placeholder='Ex: ohada.save@gmail.com' value={username} onChange={setUsername} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5'>Mot de passe</label>
                <Input.Password size='large' prefix={<Lock className='w-4 h-4 text-gray-400' />} placeholder='Votre mot de passe' value={password} onChange={setPassword} />
              </div>
              <Button type='primary' long size='large' loading={loading} onClick={() => void handleSignIn()} style={{ backgroundColor: '#6b1102', borderColor: '#6b1102' }}>
                Se connecter
              </Button>
            </div>
          </TabPane>

          <TabPane key='signup' title="S'inscrire">
            <div className='space-y-4 mt-4' onKeyDown={handleKeyDown}>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5'>Nom d&apos;utilisateur ou email</label>
                <Input size='large' prefix={<User className='w-4 h-4 text-gray-400' />} placeholder='Choisissez un identifiant' value={username} onChange={setUsername} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5'>Mot de passe (min. 6 caractères)</label>
                <Input.Password size='large' prefix={<Lock className='w-4 h-4 text-gray-400' />} placeholder='Mot de passe' value={password} onChange={setPassword} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5'>Confirmer le mot de passe</label>
                <Input.Password size='large' prefix={<Lock className='w-4 h-4 text-gray-400' />} placeholder='Confirmer le mot de passe' value={confirmPassword} onChange={setConfirmPassword} />
              </div>
              <Button type='primary' long size='large' loading={loading} onClick={() => void handleSignUp()} style={{ backgroundColor: '#6b1102', borderColor: '#6b1102' }}>
                Créer un compte
              </Button>
            </div>
          </TabPane>
        </Tabs>

        <div className='mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
          <span className='inline-flex items-center gap-1'>
            <ShieldCheck className='w-3.5 h-3.5 text-emerald-600' />
            Isolation multi-utilisateurs active
          </span>
          <button type='button' onClick={fillDemoAccount} className='text-[#6b1102] dark:text-[#ff6b5b] hover:underline font-medium cursor-pointer'>
            Remplir compte démo
          </button>
        </div>
      </div>
    </div>
  );
};
