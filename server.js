const http = require("http")

const resolvePost = req => new Promise( resolve => {
    let chunk = ''
    req.on('data', data=> {
        chunk += data;
    })
    req.on('end', ()=>{
        resolve(JSON.parse(chunk))
    })
})

http.createServer(async(req, res) => {
    console.log('receive request')
    if (req.method === 'POST' && req.url === '/') {
        const data = await resolvePost(req);
        console.log(data)
    }
    res.end('ok')
}).listen(3000, () => {
    console.log('server is ready')
})