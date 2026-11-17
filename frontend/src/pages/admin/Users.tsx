import { Delete20Regular, PersonAdd20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { ConfirmDialog, useToast } from '../../components/feedback'
import { Query } from '../../components/Query'
import { PageHeader, Panel } from '../../components/ui'
import { getJSON, send } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtDate } from '../../lib/constants'

interface User { id: number; email: string; name: string; role: 'admin' | 'user'; status: string; source: string; created_by: string | null; created_at: string | null; last_login: string | null; protected: boolean }
interface Data { users: User[]; allowed_domains: string[]; admin_emails: string[] }

const SOURCE: Record<string, string> = { bootstrap: 'Configured admin', domain: 'Signed in with a work domain', invited: 'Added by an admin' }

export default function Users() {
  const q = useQuery({ queryKey: ['admin-users'], queryFn: () => getJSON<Data>('/api/admin/users') })
  return <Query q={q}>{(d) => <View d={d} />}</Query>
}

function View({ d }: { d: Data }) {
  const { me } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [removing, setRemoving] = useState<User | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  const fail = (e: unknown) => toast('error', (e as Error).message)

  const add = useMutation({
    mutationFn: () => send('POST', '/api/admin/users', { email, name, role }),
    onSuccess: () => { toast('ok', `${email} can now sign in as ${role === 'admin' ? 'an admin' : 'a user'}.`); setEmail(''); setName(''); setRole('user'); refresh() },
    onError: fail,
  })
  const change = useMutation({
    mutationFn: (u: { id: number; role: string }) => send('PATCH', `/api/admin/users/${u.id}`, { role: u.role }),
    onSuccess: () => { toast('ok', 'Role updated.'); refresh() },
    onError: fail,
  })
  const remove = useMutation({
    mutationFn: (u: User) => send('DELETE', `/api/admin/users/${u.id}`),
    onSuccess: (_r, u) => { toast('ok', `${u.email} no longer has access.`); setRemoving(null); refresh() },
    onError: (e) => { fail(e); setRemoving(null) },
  })
  const submit = (e: FormEvent) => { e.preventDefault(); add.mutate() }
  const domains = d.allowed_domains.map((x) => `@${x}`).join(' and ')
  const admins = d.users.filter((u) => u.role === 'admin').length

  return (
    <>
      <PageHeader />
      <div className="notice notice--info" role="note">
        <p>Anyone with a {domains} Microsoft account can sign in as a user. Add people here to make them admins, or to let someone from another domain in. {d.admin_emails.join(' and ')} are admins set in configuration.</p>
      </div>

      <Panel title="Add a person">
        <form className="form-row" onSubmit={submit}>
          <label className="field"><span>Work email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@c5i.ai" /></label>
          <label className="field"><span>Name <em>optional</em></span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" /></label>
          <label className="field field--sm"><span>Role</span>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')}><option value="user">User</option><option value="admin">Admin</option></select>
          </label>
          <button type="submit" className="btn btn--primary" disabled={add.isPending || !email.includes('@')}><PersonAdd20Regular />{add.isPending ? 'Adding…' : 'Add person'}</button>
        </form>
      </Panel>

      <Panel pad={false} className="aa-row" title={`People with access · ${d.users.length}`} sub={`${admins} admin${admins === 1 ? '' : 's'}, ${d.users.length - admins} user${d.users.length - admins === 1 ? '' : 's'}.`}>
        <div className="table-wrap">
          <table className="table users">
            <thead><tr><th>Person</th><th>Role</th><th>How they got access</th><th>Last sign-in</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {d.users.map((u) => {
                const self = u.email === me?.email
                const locked = u.protected || self
                return (
                  <tr key={u.id}>
                    <th scope="row">
                      <span className="person">
                        <span className="um__avatar" aria-hidden="true">{(u.name || u.email).split(/[\s@.]+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}</span>
                        <span><b>{u.name || u.email.split('@')[0]}{self && <span className="pill" style={{ marginLeft: 6 }}>You</span>}</b><small>{u.email}</small></span>
                      </span>
                    </th>
                    <td>
                      {locked ? <span className={`pill ${u.role === 'admin' ? 'pill--violet' : 'pill--blue'}`}>{u.role === 'admin' ? 'Admin' : 'User'}</span> : (
                        <select className="select select--sm" value={u.role} aria-label={`Role for ${u.email}`} onChange={(e) => change.mutate({ id: u.id, role: e.target.value })}>
                          <option value="user">User</option><option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="wrap-sm">{SOURCE[u.source] ?? u.source}{u.created_by && u.source === 'invited' ? <small className="cell-note">by {u.created_by}</small> : null}</td>
                    <td className="nowrap">{u.last_login ? fmtDate(u.last_login.slice(0, 10)) : <span className="muted">Not yet</span>}</td>
                    <td className="num">
                      {!locked && (
                        <button type="button" className="btn btn--subtle btn--danger-text" onClick={() => setRemoving(u)}><Delete20Regular />Remove</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <ConfirmDialog open={!!removing} title={`Remove ${removing?.email}?`} confirmLabel="Remove access" busy={remove.isPending}
        body={<p>They will be signed out on their next request and cannot sign in again, even with a {domains} account, until an admin adds them back.</p>}
        onCancel={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing)} />
    </>
  )
}
