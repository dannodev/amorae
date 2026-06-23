const RecipeEditor = ({ materials, recipe, onChange, currency }) => {
  const unusedMaterial = materials.find((material) => !recipe.some((ingredient) => ingredient.materialId === material.id));
  const addIngredient = () => {
    if (!unusedMaterial) return;
    onChange([...recipe, { materialId: unusedMaterial.id, quantity: "" }]);
  };
  const updateIngredient = (index, updates) => onChange(
    recipe.map((ingredient, ingredientIndex) => ingredientIndex === index ? { ...ingredient, ...updates } : ingredient)
  );
  const removeIngredient = (index) => onChange(recipe.filter((_, ingredientIndex) => ingredientIndex !== index));
  const cost = recipe.reduce((total, ingredient) => {
    const material = materials.find((item) => item.id === ingredient.materialId);
    const lineCost = Number(ingredient.quantity || 0) * Number(material?.costPerUnit || 0);
    return total + (Number.isFinite(lineCost) ? lineCost : 0);
  }, 0);

  return (
    <div className="rounded-2xl border border-primary-dull/10 bg-[#fbf6ef] p-4 md:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-bold text-cocoa">Receta y costo automático</h3>
          <p className="mt-1 text-xs text-stone-500">Cantidad utilizada para producir una unidad vendible de este producto.</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-2 text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Costo por unidad</span>
          <strong className="font-display text-xl text-primary-dull">{currency}{cost.toFixed(2)}</strong>
        </div>
      </div>

      {materials.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Primero registra materias primas para construir la receta. Puedes guardar un costo manual mientras tanto.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {recipe.map((ingredient, index) => {
              const material = materials.find((item) => item.id === ingredient.materialId);
              return (
                <div key={`${ingredient.materialId}_${index}`} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                  <select value={ingredient.materialId} onChange={(event) => updateIngredient(index, { materialId: event.target.value })} className="seller-input rounded-xl px-3 py-2.5 text-sm">
                    <option value="">Selecciona ingrediente</option>
                    {materials.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={item.id !== ingredient.materialId && recipe.some((entry) => entry.materialId === item.id)}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <input min="0.001" max="1000000" step="0.001" type="number" value={ingredient.quantity} onChange={(event) => updateIngredient(index, { quantity: event.target.value })} placeholder="Cantidad" className="seller-input w-full rounded-xl px-3 py-2.5 pr-12 text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">{material?.unit || ""}</span>
                  </div>
                  <button type="button" onClick={() => removeIngredient(index)} aria-label={`Quitar ingrediente ${index + 1}`} className="h-10 cursor-pointer rounded-xl border border-red-100 px-4 text-sm font-bold text-red-500">Quitar</button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addIngredient} disabled={!unusedMaterial} className="mt-3 cursor-pointer rounded-xl bg-[#f4e8d8] px-4 py-2.5 text-xs font-bold text-primary-dull disabled:cursor-not-allowed disabled:opacity-45">+ Agregar ingrediente</button>
        </>
      )}
    </div>
  );
};

export default RecipeEditor;
