
--DROP TABLE api.room
--delete from api.room
--select * from api.room

CREATE TABLE api.room (
	gml_id text NULL,
	gml_parent_id text NULL,
	gml_description text NULL,
	gml_name text NULL,
	the_geom geometry null,
	CONSTRAINT room_pkey PRIMARY KEY (gml_id)	
);

CREATE INDEX idx_room_the_geom ON api.room USING gist (the_geom);

--DROP TABLE api.door
--delete from api.door
--select * from api.door

CREATE TABLE api.door (
	gml_id text NULL,
	gml_parent_id text NULL,
	gml_description text NULL,
	gml_name text NULL,
	the_geom geometry null,
	CONSTRAINT door_pkey PRIMARY KEY (gml_id)
);
CREATE INDEX idx_door_the_geom ON api.door USING gist (the_geom);


--DROP TABLE api.state
--delete from api.state
--select * from api.state

CREATE TABLE api.state (
	gml_parent_id text NULL,
	gml_parent_property text NULL,
	xlink_href text NULL,
	gml_id text NULL,
	gid float4 NULL,
	geom geometry null,
	CONSTRAINT state_pkey PRIMARY KEY (gml_id)
);
CREATE INDEX id_state_idx ON api.state USING btree (gid);
CREATE INDEX state_geom_1634228563129 ON api.state USING gist (geom);


--DROP TABLE api.transition
--delete from api.transition
--select * from api.transition

CREATE TABLE api.transition (
	gml_parent_id text NULL,
	gml_parent_property text NULL,
	gml_id text NULL,
	"source" int4 NULL,
	target int4 NULL,
	the_geom geometry NULL,
	gid serial NOT NULL,
	length float8 NULL,
	CONSTRAINT transition_pkey PRIMARY KEY (gid)
);
CREATE INDEX id_transition_idx ON api.transition USING btree (gid);
CREATE INDEX transition_the_geom_1634228563131 ON api.transition USING gist (the_geom);

--DROP TABLE api.sensores
--delete from api.sensores
--select * from api.sensores;

CREATE TABLE api.sensores (
	id serial not null,
	uid varchar(17) NULL,
	the_geom geometry(PointZ, 3857) NOT null,
	CONSTRAINT sensores_pkey PRIMARY KEY (id)
);
CREATE INDEX sensores_the_geom_idx ON api.sensores USING gist (the_geom);

ALTER TABLE api.sensores  ADD PRIMARY KEY (id);
CREATE INDEX id_sensores_idx ON api.sensores USING btree (id);
CREATE INDEX uid_sensores_idx ON api.sensores USING btree (uid);
CREATE INDEX sensoresgeo_idx ON api.sensores USING gist (the_geom);

--Asignar permisos
grant select on api.room to web_anon;
grant select on api.door to web_anon;
grant select on api.state to web_anon;
grant select on api.transition to web_anon;
grant select on api.sensores to web_anon;

--Funcion de ruteo
CREATE OR REPLACE FUNCTION api.ruteo (Origen text , Destino text) RETURNS json AS $$
SELECT row_to_json(f) As feature FROM 
	( SELECT 'FeatureCollection' As type, array_to_json(array_agg(rutaCole)) As features FROM 
		( SELECT 'Feature' As type, ST_AsGeoJSON(ruta.the_geom)::json As geometry  FROM 
			(SELECT ST_Transform (the_geom,4326) as the_geom , gid, cost, source, target FROM 
		     	pgr_dijkstra('SELECT gid as id, source, target, length as cost FROM api.transition',
						    (SELECT gid FROM api.state WHERE gml_id LIKE '%'||(SELECT gml_id FROM api.room where gml_name=$1)||'')::int4,
							(SELECT gid FROM api.state WHERE gml_id LIKE '%'||(SELECT gml_id FROM api.room where gml_name=$2)||'')::int4,
							false
						), api.transition WHERE edge = gid ORDER BY seq
		     		) as ruta) as rutaCole) As f;
$$ LANGUAGE SQL;

--select api.ruteo ('1L','4L');


--Funcion para seleccionar punto origen destino
CREATE OR REPLACE FUNCTION api.punto(punto text) RETURNS json AS $$
SELECT row_to_json(f) As feature
     FROM (	SELECT 'Feature' As type,
		ST_AsGeoJSON(p.geom)::json As geometry,
		row_to_json((SELECT a FROM (SELECT p.gid) As a)) As properties
		FROM (SELECT gid, ST_Transform (geom,4326) as geom 
			  FROM api.state
			  WHERE gml_id LIKE '%'||(SELECT esp.gml_id FROM (Select gml_id, gml_name from api.room union select gml_id, gml_name from api.door) as esp where gml_name=$1)||'') AS p) As f;
$$ LANGUAGE SQL;

--select api.punto ('1A');


--Funcion de sensores
CREATE OR REPLACE FUNCTION api.Sensores () RETURNS json AS $$
SELECT row_to_json(f) As feature FROM 
	( SELECT 'FeatureCollection' As type, array_to_json(array_agg(sensores)) As features FROM 
		( SELECT 'Feature' As type, 
		 ST_AsGeoJSON(ST_Transform (sensor.the_geom,4326))::json As geometry,
		 row_to_json((SELECT a FROM (SELECT sensor.uid, sensor.x, sensor.y, sensor.z) As a)) As properties
		 FROM 
		 (select uid, ST_X(the_geom) as x, ST_Y(the_geom) as y, ST_Z(the_geom) as z, the_geom  from api.sensores)as sensor)as sensores)As f;
$$ LANGUAGE SQL;

--select api.Sensores();

-- espacio de ubicación en fugura 3D formada por poligonos
CREATE OR REPLACE FUNCTION api.ubi (x float8, y float8, z float8) RETURNS json AS $$
SELECT row_to_json(f) As feature FROM 
	( SELECT 'Feature' As type, 
		ST_AsGeoJSON(ST_Transform (geom,4326))::json As geometry,
		row_to_json((SELECT a FROM (SELECT refe.gml_name, refe.gml_description) As a)) As properties
		FROM 
		  (
		  --convierte la lista de polígonos que forman el objeto 3D y lo convierte en "Multipolygon"
		  select lista.gml_id,lista.gml_name,lista.gml_description, ST_Collect(lista.geom) as geom
		  from (
		  		--convierte las caras del objeto 3D en "polygon"
			  	SELECT r.gml_id,r.gml_name,r.gml_description, (ST_dump(r.the_geom)).geom as geom
			  	--une room y dooor
				FROM (Select gml_id, gml_name,gml_description, the_geom from api.room union select gml_id, gml_name,gml_description,the_geom from api.door) As r 
				--selecciona el espacio donde esta contenido el punto de ubicación
				WHERE geometry_contained_3d('SRID=3857;POINT('||($1)||' '||($2)||' '||($3)||')',r.the_geom))As lista
			GROUP BY lista.gml_id,lista.gml_name,lista.gml_description) As refe
	) As f;
$$ LANGUAGE SQL;

--select api.ubi (-8279227.4,484146.6,3.8);

--ubicación real en punto coordenadas geograficas
CREATE OR REPLACE FUNCTION api.ubi_point (x float8, y float8, z float8) RETURNS json AS $$
SELECT row_to_json(f) As feature FROM 
	( SELECT 'Feature' As type, 
		ST_AsGeoJSON(ST_Transform ('SRID=3857;POINT('||($1)||' '||($2)||' '||($3)||')',4326))::json As geometry
	) As f;
$$ LANGUAGE SQL;

--select api.ubi_point (-8279227.40115,484146.599547,3.8);






