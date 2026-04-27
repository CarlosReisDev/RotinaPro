// Comprime uma imagem (File/Blob) para base64 JPEG, redimensionando o maior
// lado a `maxLado` e aplicando `qualidade` (0..1).
//
// Saída: { base64: 'data:image/jpeg;base64,...', tamanhoKB: number }
//
// Por que comprimir no cliente:
//   - Body POST da Edge Function tem limite ~1 MB
//   - Tráfego de upload mobile pode ser caro/lento
//   - Privacidade: foto é descartada após análise (3.1c não persiste)
export async function comprimirImagem(file, { maxLado = 1024, qualidade = 0.7 } = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Arquivo precisa ser uma imagem.')
  }

  const url = URL.createObjectURL(file)
  let img
  try {
    img = await carregarImagem(url)
  } finally {
    // só revoga após uso; se carregar lançar, ainda revoga
  }

  try {
    const ratio = Math.min(1, maxLado / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * ratio))
    const h = Math.max(1, Math.round(img.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível.')
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', qualidade))
    if (!blob) throw new Error('Falha ao comprimir imagem.')

    const base64 = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.onerror = () => rej(new Error('Falha ao ler imagem comprimida.'))
      r.readAsDataURL(blob)
    })

    return { base64, tamanhoKB: Math.round(blob.size / 1024) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function carregarImagem(url) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error('Imagem inválida ou corrompida.'))
    i.src = url
  })
}
