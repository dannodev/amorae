import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="mx-auto flex min-h-[62vh] max-w-xl flex-col items-center justify-center py-16 text-center">
    <span className="section-kicker">Error 404</span>
    <h1 className="section-title mt-3">Este antojo no está en la vitrina</h1>
    <p className="mt-4 text-sm leading-6 text-stone-500">
      La página que buscas no existe o cambió de dirección.
    </p>
    <Link to="/products" className="btn-primary mt-7 px-7 py-3">
      Ver todos los postres
    </Link>
  </section>
);

export default NotFound;
