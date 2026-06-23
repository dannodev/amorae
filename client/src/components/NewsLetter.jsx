import { useState } from "react"

const getWhatsAppNumber = () => {
  const raw = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || "523330089383"
  return raw.replace(/\D/g, "") || "523330089383"
}

const NewsLetter = () => {
  const [email, setEmail] = useState("")

  const handleSubmit = (event) => {
    event.preventDefault()
    const cleanEmail = email.trim().slice(0, 254)
    const message = `Hola Amorae, quiero recibir novedades y sabores de temporada. Mi correo es: ${cleanEmail}`
    window.location.assign(`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`)
  }

  return (
    <section className="relative my-24 overflow-hidden rounded-[2rem] border border-primary-dull/10 bg-[#f2dfc7] px-6 py-14 text-center shadow-[0_20px_60px_rgba(87,48,29,0.1)] md:rounded-[2.75rem] md:px-12 md:py-20">
      <div className="absolute -left-14 -top-16 h-48 w-48 rounded-full bg-white/35 blur-sm" />
      <div className="absolute -bottom-20 -right-14 h-56 w-56 rounded-full border-[42px] border-primary-dull/6" />
      <div className="relative mx-auto max-w-2xl">
        <span className="section-kicker">Cartas desde el horno</span>
        <h2 className="section-title">Antojos nuevos, directo a tu correo</h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-stone-600 md:text-base">
          Déjanos tu correo y abriremos WhatsApp para que confirmes personalmente tu solicitud.
        </p>
        <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-lg flex-col gap-3 rounded-3xl bg-white/60 p-2 shadow-sm backdrop-blur sm:flex-row sm:rounded-full">
          <input
            className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm text-cocoa outline-none placeholder:text-stone-400"
            type="email"
            placeholder="tu@email.com"
            value={email}
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit" className="btn-primary px-6 py-3 text-sm">
            Solicitar por WhatsApp
          </button>
        </form>
      </div>
    </section>
  )
}

export default NewsLetter
