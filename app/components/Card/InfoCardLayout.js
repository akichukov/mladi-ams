/**
 * Created by Mile on 2/8/2017.
 */
import React, {Component} from 'react';
import {ListView, View, Text, AsyncStorage, ActivityIndicator, NetInfo} from 'react-native';

import InfoCard from './InfoCard';
import ErrorHandler from '../ErrorHandler';
import SearchBar from 'react-native-searchbar';
import styles from './styles';
const ORGANIZATIONS_API = 'http://mladi.ams.mk/eduservice.svc/GetOrganizations';
const DORMS_API = 'http://mladi.ams.mk/eduservice.svc/GetDorms';
const LIBRARIES_API = 'http://mladi.ams.mk/eduservice.svc/GetLibraries';
const UNIVERSITIES_API = 'http://mladi.ams.mk/eduservice.svc/GetUniversities';
const ARTICLES_API = 'http://mladi.ams.mk/eduservice.svc/GetArticles';

var listingTypes = {
    UNDEFINED: 1,
    ORGANIZATION: 2,
    UNIVERSITIES: 3,
    SCHOOLS: 4,
    ARTICLES: 5
};

var category = {};
class InfoCardLayout extends Component {
    constructor(props) {
        super(props);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        this.state = {
            searchPressed: false,
            completeData: [],
            dataSource: this.ds.cloneWithRows(this.ds),
            isLoading: true,
            isConnected: null,
            offlineMode: true
        };
    }

    fetchData(query) {
        return fetch(query)
            .then((response) => response.json())
            .then((data) => data)
    }

    getCategoryAPI() {
        switch (this.props.categoryName) {
            case 'Организација':
                category.type = listingTypes.ORGANIZATION;
                category.API = ORGANIZATIONS_API;
                category.keyword = 'Организација';
                break;
            case 'Студентска организација':
                category.type = listingTypes.ORGANIZATION;
                category.API = ORGANIZATIONS_API;
                category.keyword = 'Студентска организација';
                break;
            case 'Средни училишта':
                category.type = listingTypes.SCHOOLS;
                category.API = UNIVERSITIES_API;
                category.keyword = 'Средни училишта';
                break;
            case 'Универзитети':
                category.type = listingTypes.UNIVERSITIES;
                category.API = UNIVERSITIES_API;
                category.keyword = 'Универзитети';
                category.keyword2 = 'Установи';
                break;
            case 'Студентски домови':
                category.type = listingTypes.UNDEFINED;
                category.API = DORMS_API;
                category.keyword = 'Студентски домови';
                break;
            case 'Библиотеки':
                category.type = listingTypes.UNDEFINED;
                category.API = LIBRARIES_API;
                category.keyword = 'Библиотеки';
                break;
            case 'Актуелно':
                category.type = listingTypes.ARTICLES;
                category.API = ARTICLES_API;
                category.keyword = 'Актуелно';
                break;
            case 'Проекти':
                category.type = listingTypes.ARTICLES;
                category.API = ARTICLES_API;
                category.keyword = 'Проекти';
                break;
            default:
                break;
        }
    }

    manageDataFromAPI(data, scope) {
        data = scope.filterThroughArray(data, category.type, category.keyword);
        data = data.reverse();
        scope.setState({
            completeData: data,
            dataSource: scope.ds.cloneWithRows(data),
            isLoading: false
        });
    }

    goOfflineMode(scope, data) {
        scope.setState({
            offlineMode: !!data,
        });
        !!data ? scope.manageDataFromAPI(data, scope) :
            scope.setState({
                isLoading: false
            })
    }

    checkLocalStorage(category, scope) {
        AsyncStorage.getItem(category.keyword)
            .then((data) => JSON.parse(data))
            .then((data) => {
                scope.goOfflineMode(scope, data);
            }).catch((err) => {
            scope.setState({
                isLoading: false,
                offlineMode: false
            })
        }).done();
    }

    componentWillMount() {
        let thisClassScoped = this;
        this.getCategoryAPI();
        NetInfo.isConnected.fetch().then(isConnected => {
            if (!isConnected) {
                thisClassScoped.checkLocalStorage(category, thisClassScoped);
            }
        });
        thisClassScoped.fetchData(category.API).then(function (data) {
            AsyncStorage.setItem(category.keyword, JSON.stringify(data)).done();
            thisClassScoped.manageDataFromAPI(data, thisClassScoped);
        }).catch((err) => {
            thisClassScoped.checkLocalStorage(category, thisClassScoped);
        });
    }

    filterThroughArray(array, type, keyword) {
        return array.filter(function (item) {
            if (type === listingTypes.ORGANIZATION)
                return item.Student === keyword;
            if (type === listingTypes.UNIVERSITIES)
                return item.TypeID.includes(category.keyword.toLowerCase()) || item.TypeID.includes(category.keyword2);
            if (type === listingTypes.SCHOOLS)
                return item.TypeID === keyword;
            if (type === listingTypes.ARTICLES)
                return item.ArticleCategoryID === keyword;
            return true;
        })
    }

    _handleResults(results) {
        this.setState({
            dataSource: this.ds.cloneWithRows(results)
        });
    }

    _onBackSearchButton() {
        this.setState({
            dataSource: this.ds.cloneWithRows(this.state.completeData)
        });
        this.props.change();
    }

    resetDataSource() {
        this.setState({
            dataSource: this.ds.cloneWithRows(this.state.completeData)
        });
    }

    render() {
        return (
            <View style={styles.container}>
                {this.state.isLoading && <ActivityIndicator
                    animating={this.state.isLoading}
                    style={[styles.centering, {height: 80}]}
                    size="large"
                />}
                {!this.state.isLoading && this.state.completeData !== [] && this.state.offlineMode &&
                <View>
                    <SearchBar
                        onHide={this.resetDataSource.bind(this)}
                        placeholder="Пребарај..."
                        onBack={this._onBackSearchButton.bind(this)}
                        ref={(ref) => this.searchBar = ref}
                        data={this.state.completeData}
                        handleResults={this._handleResults.bind(this)}
                    />
                    <ListView
                        style={this.state.searchPressed && styles.searchBarMargin}
                        onScroll={this.props.onScroll}
                        enableEmptySections={true}
                        dataSource={this.state.dataSource}
                        renderRow={this._renderRow}
                    />
                </View>}
                {!this.state.isLoading && !this.state.isConnected && !this.state.offlineMode && <ErrorHandler/>}
            </View>
        );
    }

    _renderRow(rowData) {
        let properties = {};
        let name = rowData.Name;
        properties['website'] = rowData.Website;
        properties['email'] = rowData.Email;
        properties['phone'] = rowData.Telephone;
        properties['facebook'] = rowData.FB;
        properties['twitter'] = rowData.TW;
        properties['locationX'] = rowData.LocationX;
        properties['locationY'] = rowData.LocationY;

        return (<InfoCard title={name} properties={properties}/>);
    }

}
export default InfoCardLayout;