require 'dm-serializer'
require 'sinatra'
require 'haml'
require 'user_agent'

class Controller < Sinatra::Base

  set :static, true
  set :public_folder, PUBLIC_DIR

  get '/' do
    haml :index
  end

  get '/monitor' do
    haml :monitor
  end

  get '/results' do
    results = Result.all
    results &= Result.all(:type => params[:type]) if (params[:type])
    results &= Result.all(:user_agent.like => '%' + params[:user_agent] + '%') if (params[:user_agent])
    results &= Result.all(:dht_size => params[dht_size].to_i) if (params[:dht_size])
    results.to_json
  end

  post '/results' do
    json = JSON.parse(request.body.read)

    cell = json['cellular']
    data = json['data']
    size = ENV['DHT_SIZE'].to_i
    uagt = UserAgent.new(request.user_agent)

    data.each do |type, results|
      results.each do |row|
        result = Result.new(row)
        result.attributes = {
          :type       => type,
          :user_agent => [uagt.name, uagt.engine, uagt.platform].join(','),
          :mobile     => uagt.mobile?,
          :cellular   => cell,
          :dht_size   => size,
          :created_at => Time.now
        }
        result.save
      end
    end

    "OK"
  end

end
