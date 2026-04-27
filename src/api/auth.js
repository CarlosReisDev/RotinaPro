import ApiClient from './client'

const AuthClient = {
  async loginComGoogle() {
    const { error } = await ApiClient._supabaseInterno.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  },

  async logout() {
    const { error } = await ApiClient._supabaseInterno.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data, error } = await ApiClient._supabaseInterno.auth.getSession()
    if (error) throw error
    return data.session
  },

  onAuthStateChange(callback) {
    return ApiClient._supabaseInterno.auth.onAuthStateChange(callback)
  },
}

export default AuthClient
