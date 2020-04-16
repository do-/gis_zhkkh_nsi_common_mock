const http = require ('http')
const fs   = require ('fs')

const exportNsiPagingItem = JSON.parse (fs.readFileSync ('exportNsiPagingItem.json'))
const exportNsiItem = JSON.parse (fs.readFileSync ('exportNsiItem.json'))
const exportNsiList = JSON.parse (fs.readFileSync ('exportNsiList.json'))

let paging = {}; for (let k in exportNsiPagingItem) paging [k.split ('_') [0]] = 1

let address = {host: "127.0.0.1", port: 9009}

let darn = x => console.log (x)

http.createServer (handler).listen (address, x => darn (x || 'Listening to ' + JSON.stringify (address)))

let methods = {}

function croak (rp, msg) {

	rp.statusCode = 500
	rp.end (msg)

}

function ack (rp, guid) {

	rp.end (`<?xml version="1.0"?>
		<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns6="http://dom.gosuslugi.ru/schema/integration/individual-registry-base/" xmlns:ns5="http://dom.gosuslugi.ru/schema/integration/account-base/" xmlns:ns8="http://dom.gosuslugi.ru/schema/integration/metering-device-base/" xmlns:ns7="http://dom.gosuslugi.ru/schema/integration/nsi-base/" xmlns:ns13="http://dom.gosuslugi.ru/schema/integration/nsi-common/" xmlns:ns9="http://dom.gosuslugi.ru/schema/integration/organizations-registry-base/" xmlns:ns12="http://dom.gosuslugi.ru/schema/integration/bills-base/" xmlns:ns11="http://dom.gosuslugi.ru/schema/integration/payments-base/" xmlns:ns10="http://dom.gosuslugi.ru/schema/integration/organizations-base/" xmlns:ns4="http://dom.gosuslugi.ru/schema/integration/base/" xmlns:ns3="http://www.w3.org/2000/09/xmldsig#">
			<env:Header>
				<ns4:ResultHeader xmlns:ns6="http://dom.gosuslugi.ru/schema/integration/individual-registry-base/" xmlns:ns5="http://dom.gosuslugi.ru/schema/integration/account-base/" xmlns:ns8="http://dom.gosuslugi.ru/schema/integration/metering-device-base/" xmlns:ns7="http://dom.gosuslugi.ru/schema/integration/nsi-base/" xmlns:ns13="http://dom.gosuslugi.ru/schema/integration/nsi-common/" xmlns:ns9="http://dom.gosuslugi.ru/schema/integration/organizations-registry-base/" xmlns:ns12="http://dom.gosuslugi.ru/schema/integration/bills-base/" xmlns:ns11="http://dom.gosuslugi.ru/schema/integration/payments-base/" xmlns:ns10="http://dom.gosuslugi.ru/schema/integration/organizations-base/" xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns4="http://dom.gosuslugi.ru/schema/integration/base/" xmlns:ns3="http://www.w3.org/2000/09/xmldsig#"> 
					<ns4:Date>2020-04-14T20:27:19.153+03:00</ns4:Date> 
					<ns4:MessageGUID>f18c79b1-c7dc-4956-bd82-83772082b97a</ns4:MessageGUID> 
				</ns4:ResultHeader>
			</env:Header>
			<env:Body> 
				<ns4:AckRequest> 
					<ns4:Ack> 
						<ns4:MessageGUID>${guid}</ns4:MessageGUID> 
						<ns4:RequesterMessageGUID>f18c79b1-c7dc-4956-bd82-83772082b97a</ns4:RequesterMessageGUID> 
					</ns4:Ack> 
				</ns4:AckRequest> 
			</env:Body>
		</env:Envelope>`)

}

async function read (rq) {
	rq.body = ''; return new Promise ((ok, fail) => {
		rq.on ('data', s => rq.body += s).on ('end', () => ok (rq))
	})
}

async function handler (rq, rp) {

	let {soapaction} = rq.headers, [, method] = soapaction.replace (/"/g, '').split (':'), fun = methods [method] //"
	
	if (!fun) return croak (rp, 'Not implemented: ' + method)

	rp.statusCode = 200

	fun (await read (rq), rp)

}

methods.getState = (rq, rp) => {

	let [, c] = rq.body.split (':getStateRequest>'), [, g] = c.split (':MessageGUID>'), [guid] = g.split ('<')
	
	if (!/^([0-9a-f]){8}-([0-9a-f]){4}-([0-9a-f]){4}-([0-9a-f]){4}-([0-9a-f]){12}$/.test (guid)) croak (rp, `"${guid}" is not a GUID`)

	let path = `./xml/${guid}.response.xml`
	
	if (!fs.existsSync (path)) return croak (rp, 'Message ' + guid + ' not found')
	
	fs.createReadStream (path).pipe (rp)

}

methods.exportNsiList = (rq, rp) => {

	let [, c] = rq.body.split (':ListGroup>'), [code] = c.split ('<')
			
	let guid = exportNsiList [code]

	if (!guid) croak (rp, `Group "${code}" not found`)

	ack (rp, guid)

}

methods.exportNsiItem = (rq, rp) => {

	let [, c] = rq.body.split (':RegistryNumber>'), [code] = c.split ('<')
	
	if (!/^\d+$/.test (code)) croak (rp, `"${code}" is not a RegistryNumber`)	
	
	if (paging [code]) {
	
		rp.statusCode = 500
		
		return fs.createReadStream ('use_paging.xml').pipe (rp)
	
	}

	let guid = exportNsiItem [code]

	if (!guid) croak (rp, `NSI "${code}" not found`)

	ack (rp, guid)

}

methods.exportNsiPagingItem = (rq, rp) => {

	let [, c] = rq.body.split (':RegistryNumber>'), [code] = c.split ('<')
	if (!/^\d+$/.test (code)) croak (rp, `"${code}" is not a RegistryNumber`)	

	let [, p] = rq.body.split (':Page>'), [page] = p.split ('<')
	if (!/^\d+$/.test (page)) croak (rp, `"${page}" is not a page number`)	
	
	let guid = exportNsiPagingItem [code + '_' + page]

	if (!guid) croak (rp, `NSI ${code}, p. ${page} not found`)

	ack (rp, guid)

}
