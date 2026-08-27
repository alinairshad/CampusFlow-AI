/**
 * DirectoryManager — admin UI for creating, editing, and deleting
 * university directory entries (departments/offices).
 *
 * Props:
 *   token : string — admin JWT
 */
import { useCallback, useEffect, useState } from 'react'
import {
  createDirectoryEntry,
  deleteDirectoryEntry,
  listDirectoryEntries,
  updateDirectoryEntry,
} from '../../api/directory'

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------
const EMPTY_FORM = {
  name: '',
  location: '',
  working_hours: '',
  contact: '',
  services: '',       // comma-separated in the UI, split to array before submit
  category: '',
  description: '',
  latitude: '',
  longitude: '',
}

// ---------------------------------------------------------------------------
// EntryForm — shared for create and edit
// ---------------------------------------------------------------------------
function EntryForm({ initial, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.location.trim() ||
        !form.working_hours.trim() || !form.contact.trim()) {
      setError('Name, location, working hours and contact are required.')
      return
    }
    const services = form.services
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (services.length === 0) {
      setError('At least one service is required.')
      return
    }
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      working_hours: form.working_hours.trim(),
      contact: form.contact.trim(),
      services,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    }
    await onSubmit(payload, setError)
  }

  const inputCls = `w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-lgu-400`

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input name="name" value={form.name} onChange={change} required
                 placeholder="e.g. Finance Office" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Location *</label>
          <input name="location" value={form.location} onChange={change} required
                 placeholder="Block A, Room 101" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Working hours *</label>
          <input name="working_hours" value={form.working_hours} onChange={change} required
                 placeholder="Mon-Fri 9am-5pm" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact *</label>
          <input name="contact" value={form.contact} onChange={change} required
                 placeholder="email or phone" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <input name="category" value={form.category} onChange={change}
                 placeholder="Finance, Academic…" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Services * <span className="font-normal text-gray-400">(comma-separated)</span>
          </label>
          <input name="services" value={form.services} onChange={change} required
                 placeholder="Fee payment, Scholarship queries, Late fee waiver"
                 className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={change} rows={2}
                    placeholder="Optional — short description of this office"
                    className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Latitude <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input name="latitude" value={form.latitude} onChange={change} type="number" step="any"
                 placeholder="51.5074" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Longitude <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input name="longitude" value={form.longitude} onChange={change} type="number" step="any"
                 placeholder="-0.1278" className={inputCls} />
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
          {saving ? 'Saving…' : 'Save entry'}
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
// EntryRow
// ---------------------------------------------------------------------------
function EntryRow({ entry, onEdit, onDelete, deleting }) {
  return (
    <li className="px-5 py-3.5 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{entry.name}</p>
          {entry.category && (
            <span className="text-xs bg-lgu-50 text-lgu-700 px-2 py-0.5 rounded-full">
              {entry.category}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{entry.location} · {entry.working_hours}</p>
        <p className="text-xs text-gray-400 mt-0.5">{entry.service_summary}</p>
      </div>
      <div className="flex gap-1.5 shrink-0 mt-0.5">
        <button onClick={() => onEdit(entry)}
                className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg
                           text-gray-600 hover:border-lgu-400 hover:text-lgu-700 transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(entry)} disabled={deleting === entry.id}
                className="text-xs px-2.5 py-1 border border-red-200 rounded-lg
                           text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
          {deleting === entry.id ? '…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DirectoryManager({ token }) {
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [listError, setListError] = useState('')

  // Form state: null = hidden, EMPTY_FORM = create mode, {..entry} = edit mode
  const [formData, setFormData]   = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const data = await listDirectoryEntries()
      setEntries(data.entries)
    } catch {
      setListError('Failed to load directory entries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function openCreate() {
    setFormData(EMPTY_FORM)
    setEditingId(null)
  }

  function openEdit(entry) {
    setFormData({
      name:          entry.name,
      location:      entry.location,
      working_hours: entry.working_hours,
      contact:       entry.contact,
      services:      (entry.services || []).join(', '),
      category:      entry.category || '',
      description:   entry.description || '',
      latitude:      entry.latitude != null ? String(entry.latitude) : '',
      longitude:     entry.longitude != null ? String(entry.longitude) : '',
    })
    setEditingId(entry.id)
  }

  function closeForm() {
    setFormData(null)
    setEditingId(null)
  }

  async function handleSubmit(payload, setFormError) {
    setSaving(true)
    try {
      if (editingId) {
        await updateDirectoryEntry(editingId, payload, token)
      } else {
        await createDirectoryEntry(payload, token)
      }
      closeForm()
      await fetchEntries()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setFormError(detail.map((d) => d.msg).join(', '))
      } else {
        setFormError(typeof detail === 'string' ? detail : 'Save failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Delete "${entry.name}"? This cannot be undone.`)) return
    setDeletingId(entry.id)
    setDeleteError('')
    try {
      await deleteDirectoryEntry(entry.id, token)
      await fetchEntries()
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
          <h2 className="text-base font-semibold text-gray-800">University Directory</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Departments and offices visible to all students
          </p>
        </div>
        {formData === null && (
          <button onClick={openCreate}
                  className="text-sm bg-lgu-700 hover:bg-lgu-800 text-white
                             font-medium rounded-xl px-4 py-1.5 transition-colors">
            + Add entry
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {formData !== null && (
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {editingId ? 'Edit entry' : 'New directory entry'}
          </p>
          <EntryForm
            initial={formData}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            saving={saving}
          />
        </div>
      )}

      {/* Error / loading */}
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
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          No entries yet — click "+ Add entry" to create one.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingId}
            />
          ))}
        </ul>
      )}

      {/* Footer count */}
      {!loading && entries.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      )}
    </div>
  )
}
