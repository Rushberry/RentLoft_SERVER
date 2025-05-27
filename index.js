const express = require('express')
const app = express()
const port = process.env.PORT || 2008

app.get('/', (req, res) => {
  res.send('Rent Loft > https://rentloft.surge.sh')
})

app.listen(port, () => {
  console.log(`Server is running on Port > ${port}`)
})
