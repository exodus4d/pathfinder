<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Data\Mapper as Mapper;
use Model;

class System extends \Controller\AccessController {

    private $mainQuery = "SELECT
            map_sys.constellationID connstallation_id,
            map_sys.solarSystemID system_id,
            map_sys.solarSystemName system_name,
            ROUND( map_sys.security, 2) system_security,
            map_con.constellationName constallation_name,
	        map_reg.regionID region_id,
	        map_reg.regionName region_name,
	        '' type,
            IFNULL(
              (
                SELECT
                    LOWER( system_effect.typeName )
                FROM
                    invtypes system_effect INNER JOIN
                    mapdenormalize map_norm ON
                        map_norm.typeID = system_effect.typeID
                WHERE
                    system_effect.groupID = 995 AND
                    map_norm.solarSystemID = map_sys.solarSystemID
                LIMIT 1
              ), '') system_effect,
            IFNULL(
              (
                SELECT
                    map_worm_class.wormholeClassID  system_class
                FROM
                     maplocationwormholeclasses map_worm_class
                WHERE
                    map_worm_class.locationID = map_sys.regionID
                LIMIT 1
              ), 7) security
        FROM
            mapsolarsystems map_sys INNER JOIN
	        mapconstellations map_con ON
		      map_con.constellationID = map_sys.constellationID INNER JOIN
	        mapregions map_reg ON
		      map_reg.regionID = map_sys.regionID";

    private $whereQuery = "";

    // exclude Jove Space
    private $havingQuery = "HAVING
            security IS NOT NULL";

    private $orderByQuery = "ORDER BY
            system_name";

    private $limitQuery = "";

    /**
     * event handler
     */
    function beforeroute() {

        parent::beforeroute();

        // set header for all routes
        header('Content-type: application/json');
    }

    /**
     * build query
     * @return string
     */
    private function getQuery(){

        $query = $this->mainQuery;
        $query .= ' ' . $this->whereQuery;
        $query .= ' ' . $this->havingQuery;
        $query .= ' ' . $this->orderByQuery;
        $query .= ' ' . $this->limitQuery;

        return $query;
    }

    /**
     * get system data by systemId
     * @param $f3
     * @param $params
     */
    public function getById($f3, $params){

        // switch DB
        $this->setDB('CCP');

        $systemId = '';
        // check for search parameter
        if( array_key_exists( 'arg1', $params) ){
            $systemId = $params['arg1'];
        }

        $this->whereQuery = "WHERE
            map_sys.solarSystemID = " . $systemId . "";

        $this->limitQuery = "Limit 1";

        $query = $this->getQuery();

        $rows = $this->f3->get('DB')->exec($query, null, 30);

        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        $ccpData = $mapper->getData();

        // switch DB
        $this->setDB('PF');

        $system = Model\BasicModel::getNew('SystemModel');
        $system->setData(reset($ccpData));

        $data = $system->getData();

        echo json_encode($data);
    }

    /**
     * search systems by name
     * @param $f3
     * @param $params
     */
    public function search($f3, $params){

        // switch DB
        $this->setDB('CCP');

        $searchToken = '';
        // check for search parameter
        if( array_key_exists( 'arg1', $params) ){
            $searchToken = $params['arg1'];
        }

        $this->whereQuery = "WHERE
            map_sys.solarSystemName LIKE '%" . $searchToken . "%'";

        $query = $this->getQuery();

        $rows = $this->f3->get('DB')->exec($query);

        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        $data = $mapper->getData();

        echo json_encode($data);
    }

} 