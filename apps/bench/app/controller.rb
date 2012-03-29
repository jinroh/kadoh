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
    uagt = UserAgent.new(request.user_agent)
    infos = {
      :user_agent => [uagt.name, uagt.engine, uagt.platform].join(','),
      :mobile     => uagt.mobile?,
      :dht_size   => ENV['DHT_SIZE'].to_i,
      :created_at => Time.now
    }

    results = JSON.parse(request.body.read)
    results.each { |r| Result.create(r.merge(infos)) }
    "OK."
  end
end
