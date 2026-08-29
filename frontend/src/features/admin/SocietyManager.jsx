/**
 * SocietyManager — admin UI for creating, editing, and deleting
 * university society entries.
 *
 * Follows the DirectoryManager pattern exactly.
 *
 * Props:
 *   token : string — admin JWT
 */
import { useCallback, useEffect, useState } from 'react'
import {
  createSociety,
  deleteSociety,
  getSociety,
  listSocieties,
  updateSociety,
} from '../../api/societies'

// Category enum values — must match backend SocietyCategory
const CATEGORIES = [
  'Tech',
  'Sports',
  'Literary',
  'Arts',
  'Social Welfare',
  'Cultural',
  'Other',
]

// Category badge colours — distinct per category
const CAT_COLOURS = {
  'Tech':          'bg-blue-50 text-blue-700',
  'Sports':        'bg-green-50 text-green-700',
  'Literary':      'bg-amber-50 text-amber-700',
  'Arts':          'bg-pink-50 text-pink-700',
  'Social Welfare':'bg-teal-50 text-teal-700',
  'Cultural':      'bg-purple-50 text-purple-700',
  'Other':         'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  how_to_join: '',
  contact_email: '',
  social_media_link: '',   // optional
  faculty_advisor: '',     // optional
}

// ---------------------------------------------------------------------------
// SocietyForm — shared for create and edit
// ---------------------------------------------------------------------------
function SocietyForm({ initial, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.category ||
        !form.description.trim() || !form.how_to_join.trim() ||
        !form.contact_email.trim()) {
      setError('Name, category, description, how-to-join, and contact email are required.')
      return
    }
    const payload = {
      name:              form.name.trim(),
      category:          form.category,
      description:       form.description.trim(),
      how_to_join:       form.how_to_join.trim(),
      contact_email:     form.contact_email.trim(),
      social_media_link: form.social_media_link.trim() || null,
      faculty_advisor:   form.faculty_advisor.trim() || null,
    }
    await onSubmit(payload, setError)
  }

  const inputCls = `w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-lgu-400`

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input name="name" value={form.name} onChange={change} required
                 placeholder="e.g. Robotics Club" className={inputCls} />
        </div>

        {/* Category dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
          <select name="category" value={form.category} onChange={change} required
                  className={`${inputCls} bg-white`}>
            <option value="">Select a category…</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Contact email */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact email *</label>
          <input name="contact_email" type="email" value={form.contact_email} onChange={change} required
                 placeholder="society@lgu.edu.pk" className={inputCls} />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
          <textarea name="description" value={form.description} onChange={change} required rows={2}
                    placeholder="What does this society do?"
                    className={`${inputCls} resize-none`} />
        </div>

        {/* How to join */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">How to join *</label>
          <textarea name="how_to_join" value={form.how_to_join} onChange={change} required rows={2}
                    placeholder="Describe the joining process or tryout details."
                    className={`${inputCls} resize-none`} />
        </div>

        {/* Social media (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Social media <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input name="social_media_link" value={form.social_media_link} onChange={change}
                 placeholder="https://instagram.com/…" className={inputCls} />
        </div>

        {/* Faculty advisor (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Faculty advisor <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input name="faculty_advisor" value={form.faculty_advisor} onChange={change}
                 placeholder="Dr. Ahmed Khan" className={inputCls} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
                className="flex-1 bg-lgu-700 hover:bg-lgu-800 disabled:opacity-50
                           text-white text-sm font-medium rounded-xl py-2 transition-colors">
          {saving ? 'Saving…' : 'Save society'}
        </button>
        <button type="button" onClick={onCancel}
                className="px-4 text-sm text-gray-500 hover:text-gray-700 border border-gray-300
                           rounded-xl transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// SocietyRow
// ---------------------------------------------------------------------------
function SocietyRow({ society, onEdit, onDelete, deleting }) {
  const badgeCls = CAT_COLOURS[society.category] || 'bg-gray-100 text-gray-600'
  return (
    <li className="px-5 py-3.5 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{society.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>
            {society.category}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{society.description_preview}</p>
        <p className="text-xs text-gray-400 mt-0.5">{society.contact_email}</p>
      </div>
      <div className="flex gap-1.5 shrink-0 mt-0.5">
        <button onClick={() => onEdit(society)}
                className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg
                           text-gray-600 hover:border-lgu-400 hover:text-lgu-700 transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(society)} disabled={deleting === society.id}
                className="text-xs px-2.5 py-1 border border-red-200 rounded-lg
                           text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
          {deleting === society.id ? '…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SocietyManager({ token }) {
  const [societies, setSocieties]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [listError, setListError]   = useState('')
  const [formData, setFormData]     = useState(null)   // null=hidden
  const [editingId, setEditingId]   = useState(null)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const fetchSocieties = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const data = await listSocieties()
      setSocieties(data.societies)
    } catch {
      setListError('Failed to load societies.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSocieties() }, [fetchSocieties])

  function openCreate() { setFormData(EMPTY_FORM); setEditingId(null) }

  function openEdit(society) {
    setFormData({
      name:              society.name,
      category:          society.category,
      description:       society.description_preview,
      how_to_join:       '',
      contact_email:     society.contact_email,
      social_media_link: '',
      faculty_advisor:   '',
    })
    // Fetch full detail to pre-fill all fields (overrides the partial data above)
    getSociety(society.id).then(full => {
      setFormData({
        name:              full.name,
        category:          full.category,
        description:       full.description,
        how_to_join:       full.how_to_join,
        contact_email:     full.contact_email,
        social_media_link: full.social_media_link || '',
        faculty_advisor:   full.faculty_advisor || '',
      })
    })
    setEditingId(society.id)
  }

  function closeForm() { setFormData(null); setEditingId(null) }

  async function handleSubmit(payload, setFormError) {
    setSaving(true)
    try {
      if (editingId) {
        await updateSociety(editingId, payload, token)
      } else {
        await createSociety(payload, token)
      }
      closeForm()
      await fetchSocieties()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setFormError(detail.map(d => d.msg).join(', '))
      } else {
        setFormError(typeof detail === 'string' ? detail : 'Save failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(society) {
    if (!window.confirm(`Delete "${society.name}"? This cannot be undone.`)) return
    setDeletingId(society.id)
    setDeleteError('')
    try {
      await deleteSociety(society.id, token)
      await fetchSocieties()
    } catch (err) {
      const detail = err.response?.data?.detail
      setDeleteError(typeof detail === 'string' ? detail : 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">University Societies</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Clubs and societies visible to all students
          </p>
        </div>
        {formData === null && (
          <button onClick={openCreate}
                  className="text-sm bg-lgu-700 hover:bg-lgu-800 text-white
                             font-medium rounded-xl px-4 py-1.5 transition-colors">
            + Add society
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {formData !== null && (
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {editingId ? 'Edit society' : 'New society'}
          </p>
          <SocietyForm
            initial={formData}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            saving={saving}
          />
        </div>
      )}

      {/* Errors */}
      {deleteError && (
        <p className="mx-6 mt-3 text-sm text-red-600 bg-red-50 border border-red-200
                      rounded-xl px-3 py-2">
          {deleteError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
      ) : listError ? (
        <p className="text-sm text-red-500 text-center py-6">{listError}</p>
      ) : societies.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          No societies yet — click "+ Add society" to create one.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {societies.map(s => (
            <SocietyRow
              key={s.id}
              society={s}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingId}
            />
          ))}
        </ul>
      )}

      {!loading && societies.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {societies.length} societ{societies.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      )}
    </div>
  )
}
