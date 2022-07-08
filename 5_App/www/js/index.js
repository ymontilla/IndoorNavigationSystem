
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
	$('#ConectBD').prop('disabled', true);
	$('#detalle').prop('disabled', true);
	$('#AcaEstoy').prop('disabled', true);
	getsensores();
	//$('#ConectBD').attr('disabled','disabled');
	//document.getElementById("myButton").disabled = true;
    // Cordova is now initialized. Have fun!
    //console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    //document.getElementById('deviceready').classList.add('ready');
    //var viewer = new Cesium.Viewer("cesiumContainer", {timeline: false, animation: false,});
    //navigator.geolocation.getCurrentPosition (onSuccess, onError, { enableHighAccuracy: true });
	TTS.speak({
		text: 'Bienvenidos a Birmania 3D',
		locale: 'es-co',
		rate: 0.9
	}, function () {
		console.log('Text succesfully spoken');
	}, function (reason) {
		console.log(reason);
	});
}

//Orientacion respecto al norte
var itemOrient = {};

window.addEventListener("deviceorientationabsolute",orientacion, false);
function orientacion (event) {
	itemOrient = event;
}





//Variablea globales
var n =0;
var b = 0;
var startseguimiento = null;
var dispositivos = [];//Lista de dispositivos ble del sistema
var itemObject = [];//Lista de dispositivos detectados
var itemRSSI = [];//Lista de lectura de rssi
var ubicacion = [];//Lista de lectura de rssi
var p1, p2, p3;

//Cargar Cesium
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlOGM5MzlhZS01YjhlLTQ5NTAtOTY5NC00NzM2MjU4N2NlZmMiLCJpZCI6MzYwNzAsImlhdCI6MTYwMjk2Mzg3Mn0.vRSnynmP_60bcKXk-ns0GoFsr9bjxK0tVBTq9G46CbY";
var viewer = new Cesium.Viewer("cesiumContainer", {timeline: false, animation: false,});

var tileset = viewer.scene.primitives.add(
new Cesium.Cesium3DTileset({
	url: Cesium.IonResource.fromAssetId(759628),
})
);

//colorDefaultMaterial();
viewer.zoomTo(tileset);


document.getElementById('ConectBD').onclick = function (){
	if (startseguimiento != null) {
		clearInterval(startseguimiento);
	 }

	viewer.dataSources.removeAll();
	viewer.entities.removeAll();
	var origen = document.getElementById('origen').value;
	var destino = document.getElementById('destino').value;
	getruta (origen,destino);
	getorigen(origen);
	getdestino(destino);
	colorByMaterial();
};

///Función para colocar los muros con transparencia.
function colorByMaterial() {
  tileset.style = new Cesium.Cesium3DTileStyle({
    defines: {
      rol: "${feature['citygml_feature_role']}",
    },
    color: {
      conditions: [
        ["${rol} === 'boundedBy'", "color('gray', 0.5)"],
        ["true", "color('white')"], // This is the else case
      ],
    },
  });
}


function seguimiento (prueba) {
	startseguimiento = setInterval(seguimiento2,500,prueba);//rotar conforme a la posición del telefono
}

function seguimiento2 (valor) {
	viewer.scene.camera.setView({
		destination: new Cesium.Cartesian3.fromDegrees(
			valor.geometry.coordinates[0],
			valor.geometry.coordinates[1],
			valor.geometry.coordinates[2]
		),
		orientation: new Cesium.HeadingPitchRoll.fromDegrees(
		  360-itemOrient.alpha,
		  0,
		  0
		),
	  });
}


function getubicacion_Espacio (valor) {
//function getubicacion () { 
		var result= [];
		//var url = `https://18.189.53.106/api/rpc/ubi?x=-8279227.730818364&y=484144.34018133493&z=3.8`;
		var url = `https://18.189.53.106/api/rpc/ubi?x=${valor.x}&y=${valor.y}&z=${valor.z}`;
		$.ajax({
			async: false,
			url: url,
			dataType: 'json',
			success: handleResult,
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				alert("Error en la solicitud al servicio REST");
			 }
		}); 
	
		function handleResult(response){
			result = (response);
		}
		return result;
};

function getruta (origen,destino) {
			//var url = `https://18.189.53.106/api/rpc/ruteo?origen=2B&destino=4C`;
			var url = `https://18.189.53.106/api/rpc/ruteo?origen=${origen}&destino=${destino}`;
			$.ajax({
				url: url,
				success: handleResult,
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					alert("Error en la solicitud al servicio REST");
				 }
			}); // use promises
		
    function handleResult(result){
		//alert(result)
		var ruta = viewer.dataSources.add(
			Cesium.GeoJsonDataSource.load(
				result,
			  {
				stroke: Cesium.Color.FUCHSIA,
				fill: Cesium.Color.FUCHSIA,
				strokeWidth: 4,

			}
		  )
		);
		viewer.zoomTo(ruta,new Cesium.HeadingPitchRoll.fromDegrees(0.0,0.0,0));
    }
};

function getorigen (origen) {
	//var url = `https://18.189.53.106/api/rpc/punto?punto=2B`;
	var url = `https://18.189.53.106/api/rpc/punto?punto=${origen}`;
	$.ajax({
		url: url,
		success: handleResult,
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			alert("Error en la solicitud al servicio REST");
		 }
	}); // use promises

	function handleResult(result){
		var lon = result.geometry.coordinates[0]
		var lat = result.geometry.coordinates[1]
		var alt = result.geometry.coordinates[2]
	
		var posicion = viewer.entities.add({
			position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
			ellipsoid: {
				radii: new Cesium.Cartesian3(0.2, 0.2, 0.2),
				material: Cesium.Color.RED,
				},
			});
		}	
};

function getdestino(destino) {
	//var url = `https://18.189.53.106/api/rpc/punto?punto=4C`;
	var url = `https://18.189.53.106/api/rpc/punto?punto=${destino}`;
	$.ajax({
		url: url,
		success: handleResult,
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			alert("Error en la solicitud al servicio REST");
		 }
	}); // use promises

	function handleResult(result){
		var lon = result.geometry.coordinates[0]
		var lat = result.geometry.coordinates[1]
		var alt = result.geometry.coordinates[2]
	
		var posicion = viewer.entities.add({
			position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
			ellipsoid: {
				radii: new Cesium.Cartesian3(0.2, 0.2, 0.2),
				material: Cesium.Color.BLUE,
				},
			});
		}	
};

function getubicacion_point (valor) { 
	//function getubicacion () { 
			var result= [];
			//var url = `https://18.189.53.106/api/rpc/ubi_point?x=-8279227.730818364&y=484144.34018133493&z=3.8`;
			var url = `https://18.189.53.106/api/rpc/ubi_point?x=${valor.x}&y=${valor.y}&z=${valor.z}`;
			$.ajax({
				async: false,
				url: url,
				dataType: 'json',
				success: handleResult,
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					alert("Error en la solicitud al servicio REST");
				 }
			}); 
		
			function handleResult(response){
				result = (response);
			}
			return result;
		};

//Detalle interior de la ubicación
document.getElementById('detalle').onclick = function (){
	if (startseguimiento != null) {
		clearInterval(startseguimiento);
	 }
	viewer.dataSources.removeAll();
	tileset.style = new Cesium.Cesium3DTileStyle({});
	seguimiento(ubicacion);
};

//Ubicación general
document.getElementById('AcaEstoy').onclick = function (){
	if (startseguimiento != null) {
		clearInterval(startseguimiento);
		}
	//alert(dispositivos.length)
	deviceList ();
};


function deviceList () {
	b = 0;//contador de iteraciones de inicio de scaneo 5 veces//
	itemObject = [];//Lista de dispositivos detectados
	itemRSSI = [];//Lista de lectura de rssi
	ScanDevice();
};



function ScanDevice () {
	n =0;//contador de dispositivos identificados
	//inicia scaneo
	ble.startScan([],onDiscoverDevice, onError);
	
};

function onDiscoverDevice (device) {
	for(var i = 0; i<dispositivos.features.length; i++){
		if(device.id ==  dispositivos.features[i].properties.uid){
			n ++;
			var itemDisp = {};
			itemDisp.uid = device.id;
			itemDisp.x = dispositivos.features[i].properties.x;
			itemDisp.y = dispositivos.features[i].properties.y;
			itemDisp.z = dispositivos.features[i].properties.z;
			agruparJSON(itemObject,itemDisp);//Funcion para agrupar json de los dispositivos detectados del sistema

			var itemArray = {};
			itemArray.rssi = device.rssi;
			itemArray.uid = device.id;
			agruparJSON(itemRSSI,itemArray);//Funcion para agrupar los valores rssi de los dispositivos detectados
			
			if (n==4){
				//alert(b);
				b ++;
				ble.stopScan();
				if (b<5){
					ScanDevice();
				}
				else{
				var coordenada = generarEstadisticos();
				//var ubi = trilaterate(listdepu[0],listdepu[1],listdepu[2],true)
				var espacio = getubicacion_Espacio(coordenada);
				var point = getubicacion_point(coordenada);
				audioUbicacion(espacio);
				dibujarEspacioUbicacion(espacio);
				dibujarubicacion(point);
				miUbicacion(espacio.properties.gml_name);
				ubicacion = point;
				$('#detalle').prop('disabled', false);//Activa el boton de detalle
				break;
				}
			}
		}
	}
};


function generarEstadisticos () {
	//Funcion para agrupar valores leidos de rssi
	//suma los valores por dispositivo y cuenta el numero de lecturas
	var groupBy = function (miarray, prop) {
		return miarray.reduce(function(groups, item) {
			var val = item[prop];
			groups[val] = groups[val] || {uid: item.uid, sum_rssi: 0, num: 0};
			groups[val].sum_rssi += item.rssi;
			groups[val].num = groups[val].num + 1;
			return groups;
		}, {});
	}
	//llamado a la funcion
	var list = Object.values(groupBy(itemRSSI,'uid'));

	//calcula la mediana de lecturas por dispositivo
	for(var i=0; i<list.length; i++){
		//filtra por la lista de lecturas RSSI por identificador de dispositivo
		var rssidevice = getFilteredByKey(itemRSSI, "uid", list[i]["uid"]);
		//ordena por identificador de dispositivo
		rssidevice.sort(predicateBy("rssi"));
		//Calcula mediana
		list[i]["rssi_md"] = median(rssidevice)
	};

	//calcula el promedio de valores RSSI y distancias por dispositivo
	list.forEach( function( lista ){
		lista.rssi_m = parseInt(lista.sum_rssi/lista.num);
		lista.r = calDistancia(lista.rssi_md);//app.calDistancia(parseInt(device.rssi))
		lista.w1 = 1/lista.r;
		lista.w = lista.w1/suma(list,"w1");
	});

	var sumaw1 = suma(list,"w1");

	list.forEach( function( lista ){
		lista.w = lista.w1/sumaw1;
	  });
	
	//Ordena lista por valor r
	list.sort( predicateBy("r"));

	//une valores RSSI con coordenadas
	list.forEach(function(item){
		var itemObj = itemObject.find(function(lista) {
			return lista.uid === item.uid;
		});
		Object.assign(item, itemObj);
	});

	//Resultado de la depuración
	var itemObject2 = list;

	itemObject2.forEach( function( lista ){
		lista.xw = lista.w*lista.x;
		lista.yw = lista.w*lista.y;
		lista.zw = lista.w*lista.z;
	  });

	var ubipond = {x:suma(itemObject2,"xw"),y:suma(itemObject2,"yw"),z:suma(itemObject2,"zw")}
	return ubipond
	//app.printHtml(trilaterate(itemObject2[0],itemObject2[1],itemObject2[2],true),ubicacionid)
};


function calDistancia (num) {
  return Math.pow(10,(-((num-(-56))/(10*3))));//Calculo de distancia  apartir del RSSI//Cómo presentar la formula segun recomendaciones de fabricante.
};//quizas pueden cambiar de acuerdo a las condiciones ambientales de cada espacio.

function predicateBy (prop) {
	return function(a,b){
		if( a[prop] > b[prop]){
			return 1;
		}else if( a[prop] < b[prop] ){
			return -1;
		}
		return 0;
	 }
};

function agruparJSON (jsonDestino,json) {
	jsonDestino.push(json);
};

function getFilteredByKey (array, key, value) {
	return array.filter(function(e) {
		return e[key] == value;
	});
};

function suma (list,parametro) {
	var sum = 0;
	for (var i = 0; i < list.length; i++){
		
		sum +=list[i][parametro]
	}
	return sum
};

function median (list) {
	var lowMiddle = Math.floor((list.length - 1) / 2);
	var highMiddle = Math.ceil((list.length - 1) / 2);
	var median = (list[lowMiddle]["rssi"] + list[highMiddle]["rssi"]) / 2;
	return median
};

//dibuja esfera con ubicación actual
function dibujarubicacion (valor) { 
	viewer.entities.removeAll();
	//var parsedData = JSON.parse(result);
	var lon = valor.geometry.coordinates[0]
	var lat = valor.geometry.coordinates[1]
	var alt = valor.geometry.coordinates[2]

	var posicion = viewer.entities.add({
		position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
		ellipsoid: {
			radii: new Cesium.Cartesian3(0.2, 0.2, 0.2),
			material: Cesium.Color.FUCHSIA,
		},
		});
};

function dibujarEspacioUbicacion (valor) {
	viewer.dataSources.removeAll();
	var espacio = viewer.dataSources.add(
		Cesium.GeoJsonDataSource.load(
			valor,
		  {
			stroke: Cesium.Color.HOTPINK,
			fill: Cesium.Color.PINK.withAlpha(0.3),
			strokeWidth: 3,
		}
	  )
	);
	colorByMaterial();
	viewer.zoomTo(espacio,new Cesium.HeadingPitchRoll.fromDegrees(0.0,0.0,0));
};


function audioUbicacion (valor) {
	TTS.speak({
		text: 'Estás en ' + valor.properties.gml_name + valor.properties.gml_description,
		locale: 'es-co',
		rate: 0.9
	}, function () {
		console.log('Text succesfully spoken');
	}, function (reason) {
		console.log(reason);
	});
}

// Llenar campo de origen
function miUbicacion (nombre) {
    var inputNombre = document.getElementById("origen");
    inputNombre.value = nombre;
}

function getsensores() {
	var url = `https://18.189.53.106/api/rpc/sensores?`;
    $.ajax({
        url: url,
        success: handleResult,
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			alert("Error en la solicitud al servicio REST");
		 }
    }); // use promises

    function handleResult(result){
		dispositivos = result
		$('#AcaEstoy').prop('disabled', false);
		$('#ConectBD').prop('disabled', false);
    //alert(dispositivos)
    }
};

/*
function trilaterate (p1, p2, p3, return_middle) {

	function sqr(a)
	{
		return a * a;
	}
	
	function norm(a)
	{
		return Math.sqrt(sqr(a.x) + sqr(a.y) + sqr(a.z));
	}
	
	function dot(a, b)
	{
		return a.x * b.x + a.y * b.y + a.z * b.z;
	}
	
	function vector_subtract(a, b)
	{
		return {
			x: a.x - b.x,
			y: a.y - b.y,
			z: a.z - b.z
		};
	}
	
	function vector_add(a, b)
	{
		return {
			x: a.x + b.x,
			y: a.y + b.y,
			z: a.z + b.z
		};
	}
	
	function vector_divide(a, b)
	{
		return {
			x: a.x / b,
			y: a.y / b,
			z: a.z / b
		};
	}
	
	function vector_multiply(a, b)
	{
		return {
			x: a.x * b,
			y: a.y * b,
			z: a.z * b
		};
	}
	
	function vector_cross(a, b)
	{
		return {
			x: a.y * b.z - a.z * b.y,
			y: a.z * b.x - a.x * b.z,
			z: a.x * b.y - a.y * b.x
		};
	}

	var ex, ey, ez, i, j, d, a, x, y, z, b, p4;

	ex = vector_divide(vector_subtract(p2, p1), norm(vector_subtract(p2, p1)));
	
	i = dot(ex, vector_subtract(p3, p1));
	a = vector_subtract(vector_subtract(p3, p1), vector_multiply(ex, i));
	ey = vector_divide(a, norm(a));
	ez =  vector_cross(ex, ey);
	d = norm(vector_subtract(p2, p1));
	j = dot(ey, vector_subtract(p3, p1));

	x = (sqr(p1.r) - sqr(p2.r) + sqr(d)) / (2 * d);
	y = (sqr(p1.r) - sqr(p3.r) + sqr(i) + sqr(j)) / (2 * j) - (i / j) * x;
	b = sqr(p1.r) - sqr(x) - sqr(y);

	if (Math.abs(b) < 0.0000000001)
	{
		b = 0;
	}
	
	z = Math.sqrt(b);

	if (isNaN(z))
	{
		//alert("Z null")
		//return null;
		deviceList ();
	}
	
	a = vector_add(p1, vector_add(vector_multiply(ex, x), vector_multiply(ey, y)));
	
	var p4a = vector_add(a, vector_multiply(ez, z));
	var p4b = vector_subtract(a, vector_multiply(ez, z));

	if (z == 0 || return_middle)
	{
		return a;
	}
	else
	{	
		return [ p4a, p4b ];
	}	
}*/

//Error de posicionamiento
function onError(error) {
  alert('code: '    + error.code    + '\n' +
		'message: ' + error.message + '\n');
}