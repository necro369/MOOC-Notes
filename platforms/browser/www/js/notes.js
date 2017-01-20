var app = {
	firebaseUpdate: false,

	model: {
		 "notas": [{"titulo": "Comprar pan", "contenido": "Oferta en la panaderia de la esquina", "fechaout": "28/2/2017"}]
	},

	firebaseConfig: {
		apiKey: "AIzaSyBO7i0VL_RZg5xZO96o4yQH6b99tTE11HU",
		authDomain: "mooc-notes-a0527.firebaseapp.com",
		databaseURL: "https://mooc-notes-a0527.firebaseio.com",
		storageBucket: "mooc-notes-a0527.appspot.com",
		messagingSenderId: "79007920626"
	},

	inicio: function(){
		this.iniciaFastClick();
		this.iniciaBotones();
		this.refrescarLista();
	},

	iniciaFastClick: function() {
		FastClick.attach(document.body);
	},

	iniciaFirebase: function() {
		firebase.initializeApp(this.firebaseConfig);
	},

	iniciaBotones: function() {
		var salvar = document.querySelector('#salvar');
		var anadir = document.querySelector('#anadir');

		anadir.addEventListener('click' ,this.mostrarEditor ,false);
		salvar.addEventListener('click' ,this.salvarNota ,false);
	},

	mostrarEditor: function() {
		document.getElementById('titulo').value = "";
		document.getElementById('fecha').value = "";
		document.getElementById('comentario').value = "";
		document.getElementById("note-editor").style.display = "block";
		document.getElementById('titulo').focus();
	},

	salvarNota: function() {
		app.construirNota();
		app.ocultarEditor();
		app.refrescarLista();
		app.grabarDatos();
	},

	construirNota: function() {
		var notas = app.model.notas;
		notas.push({"titulo": app.extraerTitulo(), "contenido": app.extraerComentario(), "fechaout": app.extraerFecha()});
	},

	extraerTitulo: function() {
		return document.getElementById('titulo').value;
	},
	
	extraerFecha: function() {
		var value = document.getElementById('fecha').value;
		if(value == null || value == ''){
			return '';
		}else{
			var d = new Date(value);
			return d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear();
		}
	},

	extraerComentario: function() {
		return document.getElementById('comentario').value;
	},

	ocultarEditor: function() {
		document.getElementById("note-editor").style.display = "none";
	},

	refrescarLista: function() {
		var div = document.getElementById('notes-list');
		div.innerHTML = this.anadirNotasALista();
		app.addEventClickNote();
	},

	anadirNotasALista: function() {
		var notas = this.model.notas;
		var notasDivs = '';
		for (var i in notas) {
			var titulo = notas[i].titulo;
			var descripcion = notas[i].contenido;
			var fechaout = notas[i].fechaout;
			notasDivs = notasDivs + this.anadirNota(i, titulo, descripcion, fechaout);
		}
		return notasDivs;
	},

	anadirNota: function(id, titulo, descripcion, fechaout) {
		note = '<div class="note-item" id="notas[' + id + ']">';
		note += '<a href="#showNote">' + titulo + '</a>';
		note += '<div>Fecha límite: ' + fechaout + '<br>Descripción: '+ descripcion + '</div>';
		note += '</div>';
		
		return note;
	},

	grabarDatos: function() {
		window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, this.gotFS, this.fail);
	},

	gotFS: function(fileSystem) {
		fileSystem.getFile("files/"+"model.json", {create: true, exclusive: false}, app.gotFileEntry, app.fail);
	},

	gotFileEntry: function(fileEntry) {
		fileEntry.createWriter(app.gotFileWriter, app.fail);
	},

	gotFileWriter: function(writer) {
		writer.onwriteend = function(evt) {
			if(app.hayWifi() && !app.firebaseUpdate) {
				app.salvarFirebase();
			}else{
				app.firebaseUpdate = false;
			}
		};
		writer.write(JSON.stringify(app.model));
	},

	salvarFirebase: function() {
		var ref = firebase.storage().ref('model.json');
		ref.putString(JSON.stringify(app.model));
	},

	hayWifi: function() {
		return navigator.connection.type === Connection.WIFI;
	},

	leerDatos: function() {
		window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, this.obtenerFS, this.fail);
	},

	obtenerFS: function(fileSystem) {
		fileSystem.getFile("files/"+"model.json", null, app.obtenerFileEntry, app.noFile);
	},

	obtenerFileEntry: function(fileEntry) {
		fileEntry.file(app.leerFile, app.fail);
	},

	leerFile: function(file) {
		var reader = new FileReader();
		reader.onloadend = function(evt) {
			var data = evt.target.result;
			app.model = JSON.parse(data);
			app.inicio();
		};
		reader.readAsText(file);
	},

	noFile: function(error) {
		app.inicio();
	},

	fail: function(error) {
		console.log(error.code);
	},

	networkStateOffline: function(){
		var el = document.getElementById('mode');
		el.innerHTML = 'Service Offline';
	},

	networkStateOnline: function(){
		var el = document.getElementById('mode');
		el.innerHTML = 'Service Online';
	},

	updateDataCloud: function(){
		this.iniciaFirebase();

		if(app.hayWifi()){
			app.downloadFirebase();
		}else{
			app.leerDatos();
			navigator.notification.alert('Datos de dispositivo.\nNo hay wifi para actualizar fichero desde Firebase :(', null, 'Firebase', 'Aceptar');
		}
	},

	downloadFirebase: function(){
		var ref = firebase.storage().ref('model.json');
		ref.getDownloadURL().then(function(url){
			var xhr = new XMLHttpRequest();
			xhr.responseType = 'json';
			
			xhr.onload = function(event){
				var status = xhr.status;
				if(status == 200){
					var json = xhr.response;
					app.model = json;
					app.firebaseUpdate = true;
					app.grabarDatos();
					app.inicio();
					navigator.notification.alert('Datos actualizados desde Firebase :)', null, 'Firebase', 'Aceptar');
				}else{
					console.log('XMLHttpRequest: Error al leer los datos del fichero.');
					app.leerDatos();
					navigator.notification.alert('Datos de dispositivo.\nHa ocurrido un error al obtener el fichero desde Firebase :(', null, 'Firebase', 'Aceptar');
				}
			};
			
			xhr.open('GET', url, true);
			xhr.send();
		}).catch(function(error){
			console.log(error.code);
			app.leerDatos();
			if(error.code == "storage/object-not-found"){
				navigator.notification.alert('Datos de dispositivo.\nNo hay fichero compartido en Firebase :(', null, 'Firebase', 'Aceptar');
			}else{
				navigator.notification.alert('Datos de dispositivo.\nHa ocurrido un error al obtener el fichero desde Firebase :(', null, 'Firebase', 'Aceptar');
			}
		});
	},
	
	addEventClickNote:function(){
		var els = document.getElementById("notes-list").getElementsByTagName("a");
		for(var i=0; i<els.length; i++){
			els[i].addEventListener('click', function(){
				if(this.className == 'collapse'){
					this.className = '';
				}else{
					this.className = 'collapse';
				}
			});
		}
	}
};

if ('addEventListener' in document) {
	document.addEventListener("offline", app.networkStateOffline, false);
	document.addEventListener("online", app.networkStateOnline, false);
	document.addEventListener("deviceready", function() {
		app.updateDataCloud();
	}, false);
};
